import express from "express";
import path from "path";
import * as fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Garantir a existência do diretório de uploads local para o fallback de mídias
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.use(express.json({ limit: '15mb' }));

  // API routes
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  app.post("/api/generate-banner", async (req, res) => {
    try {
      const { prompt, productImages } = req.body;
      
      const parts: any[] = [];
      
      // Helper to fetch remote URLs and convert to inlineData parts for GenAI
      const imageUrlToPart = async (url: string) => {
        if (!url) return null;
        if (url.startsWith('data:')) {
          try {
            const parts = url.split(':');
            if (parts.length > 1) {
              const mimeWithBase64 = parts[1];
              const subparts = mimeWithBase64.split(';base64,');
              if (subparts.length > 1) {
                return {
                  inlineData: {
                    mimeType: subparts[0] || 'image/png',
                    data: subparts[1]
                  }
                };
              }
            }
          } catch (err) {
            console.error('Failed to parse data URL:', err);
          }
          return null;
        }

        try {
          const fetched = await fetch(url);
          if (!fetched.ok) {
            console.error(`Failed to fetch image from ${url}`);
            return null;
          }
          const arrayBuffer = await fetched.arrayBuffer();
          const mimeType = fetched.headers.get('content-type') || 'image/png';
          const base64Data = Buffer.from(arrayBuffer).toString('base64');
          return {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          };
        } catch (e) {
          console.error(`Error converting image URL to part: ${url}`, e);
          return null;
        }
      };

      if (productImages && Array.isArray(productImages)) {
        for (const imgUrl of productImages) {
          const part = await imageUrlToPart(imgUrl);
          if (part) {
            parts.push(part);
          }
        }
      }

      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: { parts: parts }
      });

      // Find the image part
      const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      
      if (imagePart && imagePart.inlineData) {
        res.json({ imageUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` });
      } else {
        res.status(500).json({ error: "Failed to generate image from AI model" });
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.message || "";
      if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
        res.status(429).json({ error: "Limite de uso da IA atingido. Por favor, aguarde alguns minutos e tente novamente." });
      } else {
        res.status(500).json({ error: "Erro interno: " + (error as Error).message });
      }
    }
  });

  // Rota de Upload Local (Fallback resiliente e super rápido para não travar em 0%)
  app.post("/api/upload", (req, res) => {
    try {
      const { filename, base64Data } = req.body;
      if (!filename || !base64Data) {
        return res.status(400).json({ error: "Nome do arquivo ou conteúdo Base64 ausente." });
      }

      // Remove prefixos Base64 de forma ultra robusta
      let cleanBase64 = base64Data;
      if (base64Data.includes(";base64,")) {
        cleanBase64 = base64Data.split(";base64,")[1];
      } else if (base64Data.includes(",")) {
        cleanBase64 = base64Data.split(",")[1];
      }
      const buffer = Buffer.from(cleanBase64, "base64");

      // Gerar um nome de arquivo único e seguro para evitar conflitos ou problemas de caracteres
      const extension = path.extname(filename) || ".jpg";
      const safeBasename = path.basename(filename, extension).replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeFilename = `${Date.now()}_${safeBasename}${extension}`;

      // Salvar nos locais apropriados de forma segura (apenas uploadsDir)
      const pathRoot = path.join(uploadsDir, safeFilename);
      fs.writeFileSync(pathRoot, buffer);

      const fileUrl = `/uploads/${safeFilename}`;
      console.log(`[Local Upload] Arquivo salvo localmente em: ${fileUrl}`);
      res.json({ imageUrl: fileUrl });
    } catch (error: any) {
      console.error("Erro ao processar upload local de fallback:", error);
      res.status(500).json({ error: "Erro interno no servidor de mídias: " + error.message });
    }
  });

  // Servir estaticamente a pasta uploads
  app.use("/uploads", express.static(uploadsDir));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
