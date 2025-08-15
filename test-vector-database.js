// Script de teste para verificar o banco vetorial
// Execute este script no console do navegador (F12 > Console)

(async function testVectorDatabase() {
    console.log('🧪 INICIANDO TESTE DO BANCO VETORIAL...');
    console.log('=====================================');
    
    try {
        // Importar serviços necessários
        const { verifyKnowledgeDocumentsTable, getKnowledgeDocuments } = window;
        
        if (!verifyKnowledgeDocumentsTable || !getKnowledgeDocuments) {
            console.error('❌ Funções não disponíveis. Certifique-se de estar na página do app.');
            return;
        }
        
        // Teste 1: Verificar conectividade
        console.log('🔍 TESTE 1: Verificando conectividade...');
        const tableCheck = await verifyKnowledgeDocumentsTable();
        
        if (!tableCheck.exists) {
            console.error('❌ FALHA: Tabela não existe ou está mal configurada');
            console.error('   Erro:', tableCheck.error);
            return;
        }
        
        console.log('✅ SUCESSO: Tabela knowledge_documents está acessível');
        
        // Teste 2: Verificar documentos existentes
        console.log('📚 TESTE 2: Verificando documentos existentes...');
        const documents = await getKnowledgeDocuments();
        
        console.log(`✅ SUCESSO: ${documents.length} documentos encontrados no banco`);
        
        if (documents.length > 0) {
            console.log('📄 DOCUMENTOS ENCONTRADOS:');
            documents.forEach((doc, index) => {
                console.log(`   ${index + 1}. ${doc.name}`);
                console.log(`      - Conteúdo: ${doc.content.substring(0, 100)}...`);
                console.log(`      - Embedding: ${doc.embedding ? 'SIM' : 'NÃO'} (${doc.embedding?.length || 0} dimensões)`);
                console.log(`      - Criado em: ${doc.created_at}`);
            });
        } else {
            console.log('📝 Nenhum documento encontrado. Faça upload de um documento para testar.');
        }
        
        console.log('=====================================');
        console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
        console.log('✅ Banco vetorial está funcionando corretamente');
        console.log('💡 Agora você pode fazer upload de documentos');
        
    } catch (error) {
        console.error('❌ ERRO NO TESTE:', error);
        console.error('   Mensagem:', error.message);
        console.log('🔧 POSSÍVEIS SOLUÇÕES:');
        console.log('   1. Verifique se executou o script SQL no Supabase');
        console.log('   2. Verifique se a extensão vector está habilitada');
        console.log('   3. Verifique suas credenciais do Supabase');
    }
})();
