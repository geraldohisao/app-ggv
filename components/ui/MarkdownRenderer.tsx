import React, { useMemo } from 'react';

const MarkdownRenderer: React.FC<{ text: string, inline?: boolean, className?: string }> = ({ text, className, inline = false }) => {
    if (!text) return null;

    const stripEmojis = (s: string) => s.replace(/[\p{Extended_Pictographic}\p{Emoji_Component}]/gu, '');

    const renderContent = (line: string) => {
        // Negrito e itálico
        line = line.replace(/(^|\s)(\*\*|__)([^\*_][\s\S]*?)\2/g, '$1<strong>$3</strong>');
        line = line.replace(/(^|\s)(\*|_)([^\*_][\s\S]*?)\2/g, '$1<em>$3</em>');
        // Remover tokens de emoji estilo :warning:, :bulb:, :check:
        line = line.replace(/:(warning|bulb|check):/g, '');
        // Links Markdown [text](url)
        line = line.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
        return <span dangerouslySetInnerHTML={{ __html: line }} />;
    };
    
    if (inline) {
        return <span className={className}>{renderContent(stripEmojis(text))}</span>;
    }

    // Normalize Executive Summary heading and collapse excessive asterisks
    const normalized = useMemo(() => {
        let t = stripEmojis(text).replace(/^[#]{1,6}\s*Resumo executivo.*$/gmi, '**Resumo executivo**');
        // collapse runs of 3+ asterisks to 2 to avoid weird emphasis
        t = t.replace(/\*{3,}/g, '**');
        return t;
    }, [text]);

    const elements = normalized.split(/\r?\n/).map((line, index) => {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('### ')) {
            return { type: 'h3', content: trimmedLine.substring(4), key: index };
        }
        if (trimmedLine.startsWith('## ')) {
            return { type: 'h2', content: trimmedLine.substring(3), key: index };
        }
        if (trimmedLine.startsWith('# ')) {
            return { type: 'h1', content: trimmedLine.substring(2), key: index };
        }
        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
            return { type: 'li', content: trimmedLine.substring(2), key: index };
        }
        if (/^\d+\.\s+/.test(trimmedLine)) {
            // lista numerada
            return { type: 'oli', content: trimmedLine.replace(/^\d+\.\s+/, ''), key: index };
        }
        if (trimmedLine === '') {
            return { type: 'br', content: '', key: index };
        }
        return { type: 'p', content: trimmedLine, key: index };
    });
    
    const groupedElements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];
    let currentOList: React.ReactNode[] = [];
    let inParagraph: React.ReactNode[] = [];
    
    const flushList = () => {
        if (currentList.length > 0) {
            groupedElements.push(<ul key={`ul-${groupedElements.length}`} className="list-disc pl-5 space-y-1 my-2">{currentList}</ul>);
            currentList = [];
        }
        if (currentOList.length > 0) {
            groupedElements.push(<ol key={`ol-${groupedElements.length}`} className="list-decimal pl-5 space-y-1 my-2">{currentOList}</ol>);
            currentOList = [];
        }
        if (inParagraph.length > 0) {
            groupedElements.push(<p key={`p-${groupedElements.length}`} className="my-2 leading-relaxed">{inParagraph}</p>);
            inParagraph = [];
        }
    };
    
    elements.forEach(el => {
        if (el.type === 'li') {
            currentList.push(<li key={el.key}>{renderContent(el.content)}</li>);
        } else if (el.type === 'oli') {
            currentOList.push(<li key={el.key}>{renderContent(el.content)}</li>);
        } else {
            flushList();
            switch(el.type) {
                case 'h1':
                    groupedElements.push(<h1 key={el.key} className="text-2xl font-extrabold mt-5 mb-3 border-b-2 pb-2">{renderContent(el.content)}</h1>);
                    break;
                case 'h2':
                    groupedElements.push(<h2 key={el.key} className="text-xl font-bold mt-4 mb-2 border-b pb-1">{renderContent(el.content)}</h2>);
                    break;
                case 'h3':
                    groupedElements.push(<h3 key={el.key} className="text-lg font-semibold mt-3 mb-1">{renderContent(el.content)}</h3>);
                    break;
                case 'p':
                    if (el.content) inParagraph.push(<span key={el.key} className="block">{renderContent(el.content)}</span>);
                    break;
                 // 'br' elements are handled by the newline split, empty 'p's are skipped.
            }
        }
    });
    
    flushList();

    return <div className={`prose-sm md:prose-base prose-slate max-w-none break-words whitespace-pre-wrap ${className}`}>{groupedElements}</div>;
};

export default MarkdownRenderer;