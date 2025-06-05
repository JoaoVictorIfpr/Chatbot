FrontEnd: "chatbot-omega-lemon.vercel.app"
BackEnd: "https://chatbot-gbxu.onrender.com"

O backend do chatbot foi publicado na plataforma Render.com. Isso foi feito criando um "Web Service", conectando-o ao repositório GitHub e configurando os comandos de build e start. As chaves de API secretas foram adicionadas como variáveis de ambiente diretamente no Vercel para segurança. Após o deploy, o Render forneceu uma URL pública para o backend, permitindo que o frontend o acesse de qualquer lugar.