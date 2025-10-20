// =================================================================
// 🔥🔥🔥 AÇÃO NECESSÁRIA: CONFIGURAÇÃO DO FIREBASE 🔥🔥🔥
// =================================================================
// Para que o aplicativo funcione, você PRECISA substituir o conteúdo
// deste arquivo pela configuração do seu próprio projeto Firebase.
//
// 1. Acesse o Firebase Console: https://console.firebase.google.com/
// 2. Selecione ou crie o seu projeto.
// 3. Vá para "Configurações do Projeto" (ícone de engrenagem ⚙️).
// 4. Na aba "Geral", role para baixo até "Seus apps".
// 5. Se não tiver um app da web, crie um.
// 6. Encontre o objeto de configuração do Firebase SDK e copie-o.
//    Ele será parecido com o exemplo abaixo.
// 7. COLE o objeto que você copiou, substituindo TODO o conteúdo
//    da constante `firebaseConfig` abaixo.
// ================================================================= 

export const firebaseConfig = {
apiKey: "AIzaSyAvP0EoCS5ePCQIb2qNxD2Ek-UOTGcXaO0",
  authDomain: "teca-54f58.firebaseapp.com",
  projectId: "teca-54f58",
  storageBucket: "teca-54f58.firebasestorage.app",
  messagingSenderId: "463169842239",
  appId: "1:463169842239:web:87ed9019f9758502635c8a",
  measurementId: "G-JRDNC9K02"
};

// =================================================================
// 🔥 AÇÃO NECESSÁRIA: LOGIN COM GOOGLE NO ANDROID (CORDOVA) 🔥
// =================================================================
// Se você for compilar para Android e usar o Login com Google,
// você precisa fornecer o "Web client ID" aqui.
//
// 1. Acesse o Google Cloud Console: https://console.cloud.google.com/
// 2. Vá para APIs e Serviços > Credenciais.
// 3. Encontre a credencial "Web client (auto created by Google Service)".
// 4. Copie o "Client ID" e cole na string abaixo.
// =================================================================

export const googleCordovaWebClientId = '463169842239-tu6f4ndah73ouap770q4lmh5uuvnn5r0.apps.googleusercontent.com';