# IPMA MCP Server

Um servidor MCP (Model Context Protocol) que fornece acesso aos dados meteorológicos do IPMA (Instituto Português do Mar e da Atmosfera) através de linguagem natural.

## 🌟 Funcionalidades

- **Previsão Meteorológica**: Obter previsões para qualquer cidade de Portugal
- **Avisos Meteorológicos**: Consultar avisos ativos em tempo real
- **Dados Sísmicos**: Aceder a informações sobre terramotos recentes
- **Estações Meteorológicas**: Observações em tempo real das estações do IPMA
- **Índice UV**: Previsões do índice ultravioleta
- **Listagem de Locais**: Ver todas as cidades disponíveis

## 🚀 Instalação e Configuração

### 1. Clonar e Instalar Dependências

```bash
# Criar diretório do projeto
mkdir ipma-mcp-server
cd ipma-mcp-server

# Copiar os arquivos (index.ts, package.json, tsconfig.json)
# Criar estrutura de diretórios
mkdir src
# Mover index.ts para src/index.ts

# Instalar dependências
npm install
```

### 2. Compilar o Projeto

```bash
npm run build
```

### 3. Configurar no Claude Desktop

Editar o arquivo de configuração do Claude Desktop:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

Adicionar a configuração:

```json
{
  "mcpServers": {
    "ipma-weather": {
      "command": "node",
      "args": ["/caminho/completo/para/ipma-mcp-server/build/index.js"],
      "env": {}
    }
  }
}
```

### 4. Reiniciar o Claude Desktop

Após salvar a configuração, reinicie o Claude Desktop.

## 🛠️ Ferramentas Disponíveis

### `get_weather_forecast`
Obter previsão meteorológica para uma cidade específica.

**Parâmetros:**
- `city` (obrigatório): Nome da cidade (ex: "Lisboa", "Porto", "Coimbra")
- `days` (opcional): Número de dias de previsão (padrão: 5, máximo: 10)

**Exemplo de uso:**
```
Qual é a previsão do tempo para Lisboa nos próximos 3 dias?
```

### `get_weather_warnings`
Obter avisos meteorológicos ativos em Portugal.

**Exemplo de uso:**
```
Há algum aviso meteorológico ativo?
```

### `get_seismic_data`
Obter dados sísmicos recentes.

**Parâmetros:**
- `area` (opcional): "continent", "azores", "madeira", ou "all" (padrão: "all")

**Exemplo de uso:**
```
Mostra-me os terramotos recentes nos Açores
```

### `get_locations`
Listar todas as cidades/locais disponíveis para previsão.

**Exemplo de uso:**
```
Quais cidades posso consultar a previsão do tempo?
```

### `get_weather_stations`
Obter dados de observação das estações meteorológicas.

**Exemplo de uso:**
```
Quais são as condições meteorológicas atuais nas estações?
```

### `get_uv_forecast`
Obter previsão do índice UV.

**Exemplo de uso:**
```
Qual é a previsão do índice UV para hoje?
```

## 📊 Exemplos de Uso

Após configurar o servidor, pode fazer perguntas como:

- "Qual é a previsão do tempo para o Porto esta semana?"
- "Há avisos de chuva forte para hoje?"
- "Mostra-me os terramotos recentes em Portugal"
- "Qual é o índice UV previsto para Lisboa?"
- "Que temperatura está a fazer nas estações meteorológicas?"

## 🔧 Desenvolvimento

### Estrutura do Projeto

```
ipma-mcp-server/
├── src/
│   └── index.ts          # Código principal do servidor
├── build/                # Código compilado
├── package.json          # Dependências e scripts
├── tsconfig.json         # Configuração TypeScript
└── README.md            # Este arquivo
```

### Scripts Disponíveis

- `npm run build`: Compilar TypeScript
- `npm run dev`: Modo de desenvolvimento com watch
- `npm start`: Executar o servidor compilado

### Adicionar Novas Funcionalidades

O servidor está estruturado de forma modular. Para adicionar nova funcionalidade:

1. Adicionar nova ferramenta em `setupToolHandlers()`
2. Implementar o método correspondente
3. Definir interfaces TypeScript se necessário
4. Recompilar e testar

## 📡 API IPMA

Este servidor usa a API pública do IPMA. Principais endpoints utilizados:

- Previsões meteorológicas por cidade
- Avisos meteorológicos
- Dados sísmicos
- Observações das estações
- Índice UV
- Lista de locais disponíveis

## ⚠️ Considerações

- A API do IPMA é gratuita mas requer uso responsável
- Dados são atualizados pelo IPMA duas vezes por dia (00UTC e 12UTC)
- Todas as horas são em UTC
- Para uso comercial, contactar o IPMA em webmaster@ipma.pt

## 📝 Licença

MIT License

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua funcionalidade
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Suporte

Se encontrar problemas:

1. Verifique se todos os arquivos estão no local correto
2. Confirme que as dependências foram instaladas
3. Verifique o arquivo de configuração do Claude Desktop
4. Consulte os logs de erro do Claude Desktop

## 🔗 Links Úteis

- [IPMA Official Website](https://www.ipma.pt)
- [IPMA API Documentation](https://api.ipma.pt)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Claude Desktop](https://claude.ai/desktop)