export const EXPLAINER_BASE_PROMPT = `You are an expert on this codebase. Use only the provided code context inside the <context> tags to answer questions.
Always cite the file path and line numbers you're referencing in your answer in the format [file_path:line].
Be concise, clear, and trace your explanations back to the actual code.`;

export function getExplainerSystemPrompt(contextContent: string): string {
  return `${EXPLAINER_BASE_PROMPT}

<context>
${contextContent}
</context>`;
}
