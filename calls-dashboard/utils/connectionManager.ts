/**
 * Gerenciador de Conexões - Evita múltiplas requisições simultâneas
 */

class ConnectionManager {
  private static instance: ConnectionManager;
  private activeRequests = new Map<string, Promise<any>>();
  private requestCount = 0;
  private maxConcurrentRequests = 3;

  private constructor() {}

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  async executeRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Se já existe uma requisição com esta chave, retornar a promessa existente
    if (this.activeRequests.has(key)) {
      console.log(`🔄 Reutilizando requisição existente: ${key}`);
      return this.activeRequests.get(key) as Promise<T>;
    }

    // Se há muitas requisições simultâneas, aguardar
    if (this.requestCount >= this.maxConcurrentRequests) {
      console.log(`⏸️ Muitas requisições simultâneas (${this.requestCount}), aguardando...`);
      await this.waitForSlot();
    }

    // Criar nova requisição
    const promise = this.createRequest(key, requestFn);
    this.activeRequests.set(key, promise);

    return promise;
  }

  private async createRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    this.requestCount++;
    console.log(`🚀 Iniciando requisição: ${key} (${this.requestCount} ativas)`);

    try {
      const result = await requestFn();
      console.log(`✅ Requisição concluída: ${key}`);
      return result;
    } catch (error) {
      console.error(`❌ Erro na requisição ${key}:`, JSON.stringify(error, null, 2));
      throw error;
    } finally {
      this.requestCount--;
      this.activeRequests.delete(key);
      console.log(`🏁 Finalizando requisição: ${key} (${this.requestCount} restantes)`);
    }
  }

  private async waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.requestCount < this.maxConcurrentRequests) {
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }

  // Limpar todas as requisições ativas (para emergências)
  clearAll(): void {
    console.log(`🧹 Limpando ${this.activeRequests.size} requisições ativas`);
    this.activeRequests.clear();
    this.requestCount = 0;
  }

  // Status do gerenciador
  getStatus(): { activeRequests: number; pendingKeys: string[] } {
    return {
      activeRequests: this.requestCount,
      pendingKeys: Array.from(this.activeRequests.keys())
    };
  }
}

export const connectionManager = ConnectionManager.getInstance();

// Função helper para usar o gerenciador
export async function managedRequest<T>(
  key: string, 
  requestFn: () => Promise<T>
): Promise<T> {
  return connectionManager.executeRequest(key, requestFn);
}
