#!/usr/bin/env node

/**
 * Teste simples do webhook de feedback
 */

const testWebhook = async () => {
  const webhookUrl = 'https://api-test.ggvinteligencia.com.br/webhook/feedback-ggv-register';
  
  // Payload de teste simples
  const testPayload = [{
    id: `${Date.now()}`,
    custom_variables: {
      deal: "62719"
    },
    email_address: "teste@ggvinteligencia.com.br",
    response_status: "completed",
    date_created: new Date().toISOString(),
    pages: [
      {
        id: "page1",
        questions: [
          {
            id: "meeting_question",
            answers: [{
              choice_id: "1193480653",
              simple_text: "Sim"
            }],
            family: "single_choice",
            subtype: "vertical",
            heading: "A reunião aconteceu?"
          },
          {
            id: "notes_question",
            answers: [{
              text: "Teste de observações - funcionando!"
            }],
            family: "open_ended",
            subtype: "essay",
            heading: "Observações"
          }
        ]
      },
      {
        id: "page2",
        questions: [
          {
            id: "accept_client",
            answers: [{
              choice_id: "1193540950",
              simple_text: "Sim"
            }],
            family: "single_choice",
            subtype: "vertical",
            heading: "Você aceita essa oportunidade como um potencial cliente?"
          },
          {
            id: "priority_now",
            answers: [{
              choice_id: "1193541110",
              simple_text: "Não"
            }],
            family: "single_choice",
            subtype: "vertical",
            heading: "É uma prioridade no momento contratar a solução?"
          }
        ]
      }
    ]
  }];

  console.log('🚀 Testando webhook...');
  console.log('📍 URL:', webhookUrl);
  console.log('📦 Payload:', JSON.stringify(testPayload, null, 2));

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
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

testWebhook().catch(console.error);
