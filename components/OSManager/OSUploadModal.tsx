import React, { useState, useEffect } from 'react';
import { OSSigner, SignerStatus, OSStatus } from '../../types';
import { useUser } from '../../contexts/DirectUserContext';
import { supabase } from '../../services/supabaseClient';
import { osEmailService } from '../../services/osEmailService';
import {
    XMarkIcon,
    CloudArrowUpIcon,
    PlusIcon,
    TrashIcon,
    UsersIcon,
    DocumentTextIcon
} from '../ui/icons';

interface OSUploadModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

interface Profile {
    id: string;
    name: string;
    email: string;
    user_function?: string;
}

const OSUploadModal: React.FC<OSUploadModalProps> = ({ onClose, onSuccess }) => {
    const { user } = useUser();
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const FINANCIAL_EMAIL = 'financeiro@grupogg.com';

    // Step 1: Upload e informações
    const [title, setTitle] = useState('');
    const [osNumber, setOsNumber] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);

    // Step 2: Assinantes
    const [signers, setSigners] = useState<Partial<OSSigner>[]>([]);
    const [expiresIn, setExpiresIn] = useState<number>(30); // dias

    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, email, user_function')
                .order('name');

            if (error) throw error;
            setProfiles(data || []);
        } catch (error) {
            console.error('Erro ao carregar perfis:', error);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === 'application/pdf') {
                setFile(droppedFile);
            } else {
                alert('Por favor, selecione apenas arquivos PDF');
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type === 'application/pdf') {
                setFile(selectedFile);
            } else {
                alert('Por favor, selecione apenas arquivos PDF');
            }
        }
    };

    const addSigner = () => {
        setSigners([
            ...signers,
            {
                name: '',
                email: '',
                role: 'Colaborador',
                status: SignerStatus.Pending,
                order: signers.length
            }
        ]);
    };

    const addSignerFromProfile = (profile: Profile) => {
        // Verifica se já não foi adicionado
        if (signers.some(s => s.email === profile.email)) {
            alert('Este colaborador já foi adicionado');
            return;
        }

        setSigners([
            ...signers,
            {
                name: profile.name,
                email: profile.email,
                role: profile.user_function || 'Colaborador',
                status: SignerStatus.Pending,
                order: signers.length
            }
        ]);
    };

    const updateSigner = (index: number, field: keyof OSSigner, value: any) => {
        const updated = [...signers];
        updated[index] = { ...updated[index], [field]: value };
        setSigners(updated);
    };

    const removeSigner = (index: number) => {
        setSigners(signers.filter((_, i) => i !== index));
    };

    const validateStep1 = () => {
        if (!title.trim()) {
            alert('Por favor, preencha o título da OS');
            return false;
        }
        if (!osNumber.trim()) {
            alert('Por favor, preencha o número da OS');
            return false;
        }
        if (!file) {
            alert('Por favor, selecione um arquivo PDF');
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (signers.length === 0) {
            alert('Adicione pelo menos um assinante');
            return false;
        }

        for (const signer of signers) {
            if (!signer.name?.trim() || !signer.email?.trim()) {
                alert('Todos os assinantes devem ter nome e e-mail preenchidos');
                return false;
            }
            // Validação básica de e-mail
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signer.email)) {
                alert(`E-mail inválido: ${signer.email}`);
                return false;
            }
        }

        return true;
    };

    const computeFileHash = async (file: File) => {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const handleNext = () => {
        if (validateStep1()) {
            setStep(2);
        }
    };

    const handleSubmit = async () => {
        if (!validateStep2()) return;

        try {
            setLoading(true);

            if (!file || !user) throw new Error('Dados incompletos');

            const finalSigners = signers;

            // 1. Upload do arquivo para Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('service-orders')
                .upload(filePath, file);

            if (uploadError) {
                // Se o bucket não existe, tenta criar
                if (uploadError.message.includes('not found')) {
                    // Criar bucket (requer permissões de admin)
                    const { error: bucketError } = await supabase.storage
                        .createBucket('service-orders', {
                            public: false,
                            fileSizeLimit: 52428800 // 50MB
                        });
                    
                    if (bucketError) throw bucketError;

                    // Tentar upload novamente
                    const { error: retryError } = await supabase.storage
                        .from('service-orders')
                        .upload(filePath, file);
                    
                    if (retryError) throw retryError;
                } else {
                    throw uploadError;
                }
            }

            // 2. Calcular hash do PDF (integridade)
            const fileHash = await computeFileHash(file);

            // 3. Criar registro da OS
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresIn);

            const { data: osData, error: osError } = await supabase
                .from('service_orders')
                .insert({
                    title: title.trim(),
                    os_number: osNumber.trim(),
                    description: description.trim() || null,
                    file_name: file.name,
                    file_path: filePath,
                    file_size: file.size,
                    file_hash: fileHash,
                    status: OSStatus.Pending,
                    created_by: user.id,
                    created_by_name: user.name,
                    total_signers: signers.length,
                    signed_count: 0,
                    expires_at: expiresAt.toISOString()
                })
                .select()
                .single();

            if (osError) throw osError;

            // 3. Criar registros dos assinantes
            const signersData = finalSigners.map((signer, index) => ({
                os_id: osData.id,
                name: signer.name!,
                email: signer.email!,
                role: signer.role || 'Colaborador',
                status: SignerStatus.Pending,
                order_index: index
            }));

            const { error: signersError } = await supabase
                .from('os_signers')
                .insert(signersData);

            if (signersError) throw signersError;

            // 4. Registrar no log de auditoria
            await supabase.rpc('log_os_event', {
                p_os_id: osData.id,
                p_event_type: 'created',
                p_event_description: `OS "${title}" criada com ${signers.length} assinante(s)`,
                p_metadata: { signers_count: signers.length }
            });

            // 5. Enviar e-mails de notificação para os assinantes
            console.log('📧 Enviando e-mails para os assinantes...');
            try {
                const { data: signersWithIds } = await supabase
                    .from('os_signers')
                    .select('*')
                    .eq('os_id', osData.id);

                if (signersWithIds) {
                    const orderWithSigners = {
                        ...osData,
                        signers: signersWithIds
                    };

                    const emailResults = await osEmailService.sendToAllSigners(orderWithSigners);
                    console.log(`📧 E-mails enviados: ${emailResults.success} sucesso, ${emailResults.failed} falhas`);

                    if (emailResults.failed > 0) {
                        alert(`⚠️ OS criada! Porém ${emailResults.failed} e-mail(s) falharam ao enviar. Você pode reenviar depois.`);
                    } else {
                        alert(`✅ Ordem de Serviço criada e ${emailResults.success} e-mail(s) enviado(s) com sucesso!`);
                    }
                } else {
                    alert('✅ Ordem de Serviço criada com sucesso!');
                }
            } catch (emailError) {
                console.error('Erro ao enviar e-mails:', emailError);
                alert('✅ OS criada! Porém houve erro ao enviar e-mails. Você pode reenviar depois.');
            }

            onSuccess();
        } catch (error: any) {
            console.error('Erro ao criar OS:', error);
            alert(`Erro ao criar OS: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Nova Ordem de Serviço</h2>
                        <p className="text-blue-100 text-sm mt-1">
                            {step === 1 ? 'Informações e Upload' : 'Adicionar Assinantes'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Progress Indicator */}
                <div className="flex items-center justify-center gap-4 px-6 py-4 bg-slate-50 border-b">
                    <div className={`flex items-center gap-2 ${step === 1 ? 'text-blue-600' : 'text-green-600'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            step === 1 ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                            {step === 1 ? '1' : '✓'}
                        </div>
                        <span className="font-semibold">Documento</span>
                    </div>
                    <div className="w-16 h-1 bg-slate-300 rounded"></div>
                    <div className={`flex items-center gap-2 ${step === 2 ? 'text-blue-600' : 'text-slate-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            step === 2 ? 'bg-blue-100' : 'bg-slate-200'
                        }`}>
                            2
                        </div>
                        <span className="font-semibold">Assinantes</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {step === 1 ? (
                        <Step1Content
                            title={title}
                        osNumber={osNumber}
                            setTitle={setTitle}
                        setOsNumber={setOsNumber}
                            description={description}
                            setDescription={setDescription}
                            file={file}
                            dragActive={dragActive}
                            handleDrag={handleDrag}
                            handleDrop={handleDrop}
                            handleFileChange={handleFileChange}
                        />
                    ) : (
                        <Step2Content
                            signers={signers}
                            profiles={profiles}
                            expiresIn={expiresIn}
                            setExpiresIn={setExpiresIn}
                            addSigner={addSigner}
                            addSignerFromProfile={addSignerFromProfile}
                            updateSigner={updateSigner}
                            removeSigner={removeSigner}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="border-t bg-slate-50 p-6 flex justify-between">
                    <button
                        onClick={step === 1 ? onClose : () => setStep(1)}
                        className="px-6 py-2 text-slate-600 hover:text-slate-800 font-semibold"
                        disabled={loading}
                    >
                        {step === 1 ? 'Cancelar' : 'Voltar'}
                    </button>
                    
                    <button
                        onClick={step === 1 ? handleNext : handleSubmit}
                        disabled={loading}
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                    >
                        {loading ? 'Processando...' : step === 1 ? 'Próximo' : 'Enviar para Assinatura'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Step 1: Upload e Informações
interface Step1ContentProps {
    title: string;
    osNumber: string;
    setTitle: (value: string) => void;
    setOsNumber: (value: string) => void;
    description: string;
    setDescription: (value: string) => void;
    file: File | null;
    dragActive: boolean;
    handleDrag: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Step1Content: React.FC<Step1ContentProps> = ({
    title,
    osNumber,
    setTitle,
    setOsNumber,
    description,
    setDescription,
    file,
    dragActive,
    handleDrag,
    handleDrop,
    handleFileChange
}) => {
    return (
        <div className="space-y-4">
            {/* Número da OS */}
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Número da OS *
                </label>
                <input
                    type="text"
                    value={osNumber}
                    onChange={(e) => setOsNumber(e.target.value)}
                    placeholder="Ex: 2025-001, 12345 ou código interno"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={120}
                />
            </div>

            {/* Título */}
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Título da OS *
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: OS - Contrato de Prestação de Serviços"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={200}
                />
            </div>

            {/* Descrição */}
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Descrição (opcional)
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Adicione detalhes sobre esta ordem de serviço..."
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    maxLength={500}
                />
            </div>

            {/* Upload de Arquivo */}
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Documento PDF *
                </label>
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl p-6 transition-colors ${
                        dragActive
                            ? 'border-blue-500 bg-blue-50'
                            : file
                            ? 'border-green-500 bg-green-50'
                            : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                    }`}
                >
                    {file ? (
                        <div className="text-center">
                            <DocumentTextIcon className="w-16 h-16 mx-auto text-green-600 mb-3" />
                            <p className="text-lg font-semibold text-slate-700 mb-1">{file.name}</p>
                            <p className="text-sm text-slate-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <div className="mt-4 flex gap-3 justify-center">
                                <label className="inline-block px-4 py-2 bg-slate-600 text-white rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                                    Alterar Arquivo
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setFile(null)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Remover
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <CloudArrowUpIcon className="w-16 h-16 mx-auto text-slate-400 mb-3" />
                            <p className="text-lg font-semibold text-slate-700 mb-1">
                                Arraste seu PDF aqui
                            </p>
                            <p className="text-sm text-slate-500 mb-4">ou</p>
                            <label className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors font-semibold">
                                Selecionar Arquivo
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                            <p className="text-xs text-slate-400 mt-4">
                                Tamanho máximo: 50MB
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Step 2: Assinantes
interface Step2ContentProps {
    signers: Partial<OSSigner>[];
    profiles: Profile[];
    expiresIn: number;
    setExpiresIn: (value: number) => void;
    addSigner: () => void;
    addSignerFromProfile: (profile: Profile) => void;
    updateSigner: (index: number, field: keyof OSSigner, value: any) => void;
    removeSigner: (index: number) => void;
}

const Step2Content: React.FC<Step2ContentProps> = ({
    signers,
    profiles,
    expiresIn,
    setExpiresIn,
    addSigner,
    addSignerFromProfile,
    updateSigner,
    removeSigner
}) => {
    const [showProfileSelector, setShowProfileSelector] = useState(false);

    return (
        <div className="space-y-6">
            {/* Seleção rápida de colaboradores */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <UsersIcon className="w-5 h-5 text-blue-600" />
                        Colaboradores do Sistema
                    </h3>
                    <button
                        onClick={() => setShowProfileSelector(!showProfileSelector)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        {showProfileSelector ? 'Ocultar' : 'Mostrar'}
                    </button>
                </div>

                {showProfileSelector && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {profiles.map((profile) => (
                            <button
                                key={profile.id}
                                onClick={() => addSignerFromProfile(profile)}
                                className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg hover:bg-blue-100 transition-colors text-left border border-slate-200"
                            >
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                                    {profile.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-700 truncate">{profile.name}</p>
                                    <p className="text-xs text-slate-500 truncate">{profile.email}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Lista de assinantes */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-700">
                        Assinantes ({signers.length})
                    </h3>
                    <button
                        onClick={addSigner}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Adicionar manualmente
                    </button>
                </div>

                {signers.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                        <UsersIcon className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                        <p className="text-slate-600">Nenhum assinante adicionado</p>
                        <p className="text-sm text-slate-400 mt-1">
                            Adicione colaboradores ou adicione manualmente
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {signers.map((signer, index) => (
                            <div
                                key={index}
                                className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold shrink-0">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <input
                                            type="text"
                                            value={signer.name || ''}
                                            onChange={(e) => updateSigner(index, 'name', e.target.value)}
                                            placeholder="Nome completo"
                                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <input
                                            type="email"
                                            value={signer.email || ''}
                                            onChange={(e) => updateSigner(index, 'email', e.target.value)}
                                            placeholder="email@exemplo.com"
                                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <select
                                            value={signer.role || 'Colaborador'}
                                            onChange={(e) => updateSigner(index, 'role', e.target.value)}
                                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="Colaborador">Colaborador</option>
                                            <option value="Gestor">Gestor</option>
                                            <option value="Testemunha">Testemunha</option>
                                            <option value="Aprovador">Aprovador</option>
                                        </select>
                                    </div>
                                    {!(signer.email || '').toLowerCase().includes('financeiro@grupogg.com') && (
                                        <button
                                            onClick={() => removeSigner(index)}
                                            className="text-red-500 hover:text-red-700 p-2"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                                {(signer.email || '').toLowerCase().includes('financeiro@grupogg.com') && (
                                    <p className="text-xs text-amber-600 mt-1">Adicionado automaticamente: financeiro@grupogg.com</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Configurações */}
            <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-700 mb-3">Configurações</h3>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                        Prazo para assinatura
                    </label>
                    <select
                        value={expiresIn}
                        onChange={(e) => setExpiresIn(Number(e.target.value))}
                        className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value={7}>7 dias</option>
                        <option value={15}>15 dias</option>
                        <option value={30}>30 dias</option>
                        <option value={60}>60 dias</option>
                        <option value={90}>90 dias</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default OSUploadModal;

