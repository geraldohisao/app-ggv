#!/usr/bin/env node

/**
 * Teste específico para observações quando reunião = Não
 */

const testObservacoes = async () => {
  const webhookUrl = 'https://api-test.ggvinteligencia.com.br/webhook/feedback-ggv-register';
  
  // Simulando exatamente o que acontece quando reunião = Não
  const feedbackData = {
    meeting_happened: false, // REUNIÃO = NÃO
    notes: "Teste de observações - cliente não tinha tempo hoje", // OBSERVAÇÕES PREENCHIDAS
    pipedrive_deal_id: "56934"
  };

  const user = {
    email: "teste@ggvinteligencia.com.br"
  };

  // Replicando exatamente a lógica do frontend
  const surveyMonkeyFormat = [{
    id: `${Date.now()}`,
    custom_variables: {
      deal: feedbackData.pipedrive_deal_id || ""
    },
    email_address: user?.email || "",
    response_status: "completed",
    date_created: new Date().toISOString(),
    pages: [
      {
        id: "page1",
        questions: [
          {
            id: "meeting_question",
            answers: [{
              choice_id: feedbackData.meeting_happened ? "1193480653" : "1193480654",
              simple_text: feedbackData.meeting_happened ? "Sim" : "Não"
            }],
            family: "single_choice",
            subtype: "vertical",
            heading: "A reunião aconteceu?"
          },
          {
            id: "notes_question",
            answers: [{
              text: feedbackData.notes || ""
            }],
            family: "open_ended",
            subtype: "essay",
            heading: "Observações"
          }
        ]
      }
    ]
  }];

  // NÃO adiciona page2 porque meeting_happened = false

  console.log('🧪 TESTE - Reunião = Não, com observações');
  console.log('📦 Payload que será enviado:');
  console.log(JSON.stringify(surveyMonkeyFormat, null, 2));

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(surveyMonkeyFormat)
    });

    console.log('📊 Status:', response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Sucesso:', result);
    } else {
      const error = await response.text();
      console.log('❌ Erro:', error);
    }
  } catch (error) {
    console.error('💥 Falha na requisição:', error.message);
  }
};

testObservacoes().catch(console.error);
