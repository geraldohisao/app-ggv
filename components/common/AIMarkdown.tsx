import React from 'react';
import MarkdownRenderer from '../ui/MarkdownRenderer';

type Props = { content: string; className?: string };

// Memoized wrapper to avoid re-renders
const AIMarkdown: React.FC<Props> = React.memo(({ content, className }) => {
  return <MarkdownRenderer text={content} className={className} />;
});

export default AIMarkdown;


