declare module '@google/generative-ai' {
  // Minimal loose typings just to satisfy the compiler in this project.
  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(opts: { model: string }): {
      generateContent: (args: any) => Promise<{ response: { text: () => string } }>;
    };
  }
}


