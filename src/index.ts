#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

// Interfaces para os dados da API IPMA
interface WeatherForecast {
  precipitaProb: string;
  tMin: string;
  tMax: string;
  predWindDir: string;
  idWeatherType: number;
  classWindSpeed: number;
  longitude: string;
  forecastDate: string;
  latitude: string;
}

interface WeatherWarning {
  text: string;
  awarenessTypeName: string;
  idAreaAviso: string;
  startTime: string;
  awarenessLevelID: string;
  endTime: string;
}

interface SeismicData {
  degree: string | null;
  dataUpdate: string;
  magType: string;
  obsRegion: string;
  lon: string;
  source: string;
  depth: number;
  time: string;
  lat: string;
  local: string | null;
  magnitud: string;
}

interface Location {
  idRegiao: number;
  idAreaAviso: string;
  idConcelho: number;
  globalIdLocal: number;
  latitude: string;
  idDistrito: number;
  local: string;
  longitude: string;
}

interface WeatherType {
  descWeatherTypeEN: string;
  descWeatherTypePT: string;
  idWeatherType: number;
}

// Interfaces para as respostas da API
interface ApiResponse<T> {
  data: T[];
  dataUpdate?: string;
}

interface StationObservation {
  temperatura: number;
  humidade: number;
  pressao: number;
  intensidadeVento: number;
  precAcumulada: number;
}

interface StationInfo {
  properties: {
    idEstacao: string;
    localEstacao: string;
  };
}

interface UVData {
  data: string;
  globalIdLocal: number;
  iUv: string;
  intervaloHora: string;
}

// Interface para os argumentos das ferramentas
interface ToolArguments {
  city?: string;
  days?: number;
  area?: string;
  [key: string]: any;
}

class IPMAServer {
  private server: Server;
  private readonly baseUrl = "https://api.ipma.pt/open-data";

  constructor() {
    this.server = new Server(
      {
        name: "ipma-weather-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_weather_forecast",
          description: "Obter previsão meteorológica para uma cidade específica em Portugal",
          inputSchema: {
            type: "object",
            properties: {
              city: {
                type: "string",
                description: "Nome da cidade (ex: Lisboa, Porto, Coimbra, Faro, etc.)"
              },
              days: {
                type: "number",
                description: "Número de dias de previsão (máximo 10)",
                default: 5
              }
            },
            required: ["city"]
          }
        },
        {
          name: "get_weather_warnings",
          description: "Obter avisos meteorológicos ativos em Portugal",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "get_seismic_data",
          description: "Obter dados sísmicos recentes",
          inputSchema: {
            type: "object",
            properties: {
              area: {
                type: "string",
                description: "Área: 'continent', 'azores', 'madeira', ou 'all'",
                default: "all"
              }
            }
          }
        },
        {
          name: "get_locations",
          description: "Listar todas as cidades/locais disponíveis para previsão",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "get_weather_stations",
          description: "Obter dados de observação das estações meteorológicas",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "get_uv_forecast",
          description: "Obter previsão do índice UV",
          inputSchema: {
            type: "object",
            properties: {}
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        const toolArgs = args as ToolArguments | undefined;

        switch (name) {
          case "get_weather_forecast":
            if (!toolArgs?.city) {
              throw new McpError(ErrorCode.InvalidParams, "City parameter is required");
            }
            return await this.getWeatherForecast(toolArgs.city, toolArgs.days || 5);
          case "get_weather_warnings":
            return await this.getWeatherWarnings();
          case "get_seismic_data":
            return await this.getSeismicData(toolArgs?.area || "all");
          case "get_locations":
            return await this.getLocations();
          case "get_weather_stations":
            return await this.getWeatherStations();
          case "get_uv_forecast":
            return await this.getUVForecast();
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(ErrorCode.InternalError, `Error: ${errorMessage}`);
      }
    });
  }

  private async getWeatherForecast(city: string, days: number) {
    try {
      // Primeiro, obter a lista de locais para encontrar o globalIdLocal
      const locationsResponse = await fetch(`${this.baseUrl}/distrits-islands.json`);
      const locationsData = await locationsResponse.json() as ApiResponse<Location>;
      
      const location = locationsData.data.find((loc: Location) => 
        loc.local.toLowerCase().includes(city.toLowerCase())
      );

      if (!location) {
        return {
          content: [
            {
              type: "text",
              text: `Cidade "${city}" não encontrada. Use get_locations para ver cidades disponíveis.`
            }
          ]
        };
      }

      // Obter previsão para o local encontrado
      const forecastResponse = await fetch(
        `${this.baseUrl}/forecast/meteorology/cities/daily/${location.globalIdLocal}.json`
      );
      const forecastData = await forecastResponse.json() as ApiResponse<WeatherForecast>;

      // Obter tipos de tempo para descrições
      const weatherTypesResponse = await fetch(`${this.baseUrl}/weather-type-classe.json`);
      const weatherTypesData = await weatherTypesResponse.json() as ApiResponse<WeatherType>;

      const weatherTypes = weatherTypesData.data.reduce((acc: any, item: WeatherType) => {
        acc[item.idWeatherType] = item;
        return acc;
      }, {});

      const limitedData = forecastData.data.slice(0, days);
      
      let result = `📍 **Previsão para ${location.local}**\n\n`;
      result += `📍 Coordenadas: ${location.latitude}, ${location.longitude}\n`;
      result += `🕐 Última atualização: ${forecastData.dataUpdate}\n\n`;

      limitedData.forEach((day: WeatherForecast) => {
        const weatherDesc = weatherTypes[day.idWeatherType]?.descWeatherTypePT || "Desconhecido";
        result += `📅 **${day.forecastDate}**\n`;
        result += `🌡️ Temperatura: ${day.tMin}°C - ${day.tMax}°C\n`;
        result += `☁️ Condições: ${weatherDesc}\n`;
        result += `🌧️ Probabilidade de precipitação: ${day.precipitaProb}%\n`;
        result += `💨 Vento: ${day.predWindDir}\n\n`;
      });

      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new McpError(ErrorCode.InternalError, `Erro ao obter previsão: ${errorMessage}`);
    }
  }

  private async getWeatherWarnings() {
    try {
      const response = await fetch(`${this.baseUrl}/forecast/warnings/warnings_www.json`);
      const data = await response.json() as WeatherWarning[];

      if (!Array.isArray(data) || data.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "✅ Não há avisos meteorológicos ativos no momento."
            }
          ]
        };
      }

      let result = "⚠️ **Avisos Meteorológicos Ativos**\n\n";
      
      data.forEach((warning: WeatherWarning) => {
        const startDate = new Date(warning.startTime).toLocaleString('pt-PT');
        const endDate = new Date(warning.endTime).toLocaleString('pt-PT');
        
        result += `🚨 **${warning.awarenessTypeName}**\n`;
        result += `📍 Área: ${warning.idAreaAviso}\n`;
        result += `🔴 Nível: ${warning.awarenessLevelID}\n`;
        result += `⏰ De: ${startDate}\n`;
        result += `⏰ Até: ${endDate}\n`;
        if (warning.text) {
          result += `📝 Detalhes: ${warning.text}\n`;
        }
        result += "\n";
      });

      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new McpError(ErrorCode.InternalError, `Erro ao obter avisos: ${errorMessage}`);
    }
  }

  private async getSeismicData(area: string) {
    try {
      let areaId: number;
      switch (area.toLowerCase()) {
        case "continent":
          areaId = 1;
          break;
        case "azores":
          areaId = 2;
          break;
        case "madeira":
          areaId = 3;
          break;
        default:
          areaId = 1; // Default to continent
      }

      const response = await fetch(`${this.baseUrl}/observation/seismic/${areaId}.json`);
      const data = await response.json() as ApiResponse<SeismicData>;

      if (!data.data || data.data.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "📍 Não há dados sísmicos recentes para a área especificada."
            }
          ]
        };
      }

      let result = `🌍 **Dados Sísmicos - ${area}**\n\n`;
      result += `🕐 Última atualização: ${data.data[0]?.dataUpdate}\n\n`;

      // Mostrar apenas os 10 mais recentes
      const recentData = data.data.slice(0, 10);
      
      recentData.forEach((earthquake: SeismicData) => {
        const eventTime = new Date(earthquake.time).toLocaleString('pt-PT');
        result += `📅 **${eventTime}**\n`;
        result += `📍 Local: ${earthquake.obsRegion || 'N/A'}\n`;
        result += `📏 Magnitude: ${earthquake.magnitud} ${earthquake.magType}\n`;
        result += `🌊 Profundidade: ${earthquake.depth} km\n`;
        result += `🗺️ Coordenadas: ${earthquake.lat}, ${earthquake.lon}\n\n`;
      });

      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new McpError(ErrorCode.InternalError, `Erro ao obter dados sísmicos: ${errorMessage}`);
    }
  }

  private async getLocations() {
    try {
      const response = await fetch(`${this.baseUrl}/distrits-islands.json`);
      const data = await response.json() as ApiResponse<Location>;

      let result = "📍 **Locais Disponíveis para Previsão**\n\n";
      
      // Agrupar por distrito/região
      const groupedByDistrict: { [key: number]: Location[] } = {};
      
      data.data.forEach((location: Location) => {
        if (!groupedByDistrict[location.idDistrito]) {
          groupedByDistrict[location.idDistrito] = [];
        }
        groupedByDistrict[location.idDistrito].push(location);
      });

      Object.values(groupedByDistrict).forEach((locations: Location[]) => {
        // Assumir que todas as localizações no grupo têm o mesmo distrito
        result += `**Região ${locations[0].idDistrito}:**\n`;
        locations.forEach((loc: Location) => {
          result += `• ${loc.local} (${loc.latitude}, ${loc.longitude})\n`;
        });
        result += "\n";
      });

      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new McpError(ErrorCode.InternalError, `Erro ao obter locais: ${errorMessage}`);
    }
  }

  private async getWeatherStations() {
    try {
      const response = await fetch(`${this.baseUrl}/observation/meteorology/stations/observations.json`);
      const data = await response.json() as { [timestamp: string]: { [stationId: string]: StationObservation } };

      // Obter também informações das estações
      const stationsResponse = await fetch(`${this.baseUrl}/observation/meteorology/stations/stations.json`);
      const stationsData = await stationsResponse.json() as StationInfo[];

      const stationsInfo = stationsData.reduce((acc: any, station: StationInfo) => {
        acc[station.properties.idEstacao] = station.properties.localEstacao;
        return acc;
      }, {});

      let result = "🌡️ **Observações das Estações Meteorológicas**\n\n";
      
      // Pegar apenas as observações mais recentes (última timestamp)
      const timestamps = Object.keys(data);
      const latestTimestamp = timestamps[timestamps.length - 1];
      const latestObservations = data[latestTimestamp];

      result += `🕐 Observações de: ${latestTimestamp}\n\n`;

      // Mostrar apenas as primeiras 15 estações para não exceder limites
      const stationIds = Object.keys(latestObservations).slice(0, 15);
      
      stationIds.forEach((stationId: string) => {
        const obs = latestObservations[stationId];
        const stationName = stationsInfo[stationId] || `Estação ${stationId}`;
        
        result += `📍 **${stationName}**\n`;
        if (obs.temperatura > -99) result += `🌡️ Temperatura: ${obs.temperatura}°C\n`;
        if (obs.humidade > -99) result += `💧 Humidade: ${obs.humidade}%\n`;
        if (obs.pressao > -99) result += `📊 Pressão: ${obs.pressao} hPa\n`;
        if (obs.intensidadeVento > -99) result += `💨 Vento: ${obs.intensidadeVento} m/s\n`;
        if (obs.precAcumulada > -99) result += `🌧️ Precipitação: ${obs.precAcumulada} mm\n`;
        result += "\n";
      });

      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new McpError(ErrorCode.InternalError, `Erro ao obter dados das estações: ${errorMessage}`);
    }
  }

  private async getUVForecast() {
    try {
      const response = await fetch(`${this.baseUrl}/forecast/meteorology/uv/uv.json`);
      const data = await response.json() as UVData[];

      if (!Array.isArray(data) || data.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "☀️ Não há dados de UV disponíveis no momento."
            }
          ]
        };
      }

      // Obter locais para mapear globalIdLocal para nomes
      const locationsResponse = await fetch(`${this.baseUrl}/distrits-islands.json`);
      const locationsData = await locationsResponse.json() as ApiResponse<Location>;
      
      const locationMap = locationsData.data.reduce((acc: any, loc: Location) => {
        acc[loc.globalIdLocal] = loc.local;
        return acc;
      }, {});

      let result = "☀️ **Previsão do Índice UV**\n\n";
      
      // Agrupar por data
      const uvByDate: { [key: string]: UVData[] } = {};
      data.forEach((uvData: UVData) => {
        if (!uvByDate[uvData.data]) {
          uvByDate[uvData.data] = [];
        }
        uvByDate[uvData.data].push(uvData);
      });

      Object.keys(uvByDate).slice(0, 3).forEach((date: string) => {
        result += `📅 **${date}**\n`;
        
        uvByDate[date].slice(0, 10).forEach((uv: UVData) => {
          const locationName = locationMap[uv.globalIdLocal] || `Local ${uv.globalIdLocal}`;
          const uvLevel = parseFloat(uv.iUv);
          let uvCategory = "";
          
          if (uvLevel <= 2) uvCategory = "Baixo 🟢";
          else if (uvLevel <= 5) uvCategory = "Moderado 🟡";
          else if (uvLevel <= 7) uvCategory = "Alto 🟠";
          else if (uvLevel <= 10) uvCategory = "Muito Alto 🔴";
          else uvCategory = "Extremo 🟣";
          
          result += `• ${locationName}: UV ${uv.iUv} (${uvCategory}) - ${uv.intervaloHora}\n`;
        });
        result += "\n";
      });

      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new McpError(ErrorCode.InternalError, `Erro ao obter previsão UV: ${errorMessage}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("IPMA MCP Server running on stdio");
  }
}

const server = new IPMAServer();
server.run().catch(console.error);