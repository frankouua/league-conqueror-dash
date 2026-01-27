import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// UAZAPI Base URL e API Key global
const UAZAPI_BASE_URL = 'https://unique.uazapi.com';
const UAZAPI_GLOBAL_API_KEY = Deno.env.get('UAZAPI_API_KEY') || '';

async function safeJsonFromResponse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// Função para gerar URLs de mídia com múltiplas variações (igual ao texto)
function buildMediaCandidateUrls(baseUrl: string, instanceName: string, mediaPath: string): string[] {
  const encoded = encodeURIComponent(instanceName);
  const prefixes = ['', '/api', '/api/v1', '/v1'];
  
  const urls: string[] = [];
  
  for (const prefix of prefixes) {
    // SEM instância no path (wuzapi padrão)
    urls.push(`${baseUrl}${prefix}${mediaPath}`);
    // COM instância no path (variantes UAZAPI)
    urls.push(`${baseUrl}${prefix}${mediaPath}/${encoded}`);
    urls.push(`${baseUrl}${prefix}/${encoded}${mediaPath}`);
  }
  
  return Array.from(new Set(urls));
}

function buildUazapiCandidateUrls(baseUrl: string, instanceName: string): string[] {
  const encoded = encodeURIComponent(instanceName);
  // UAZAPI tem variações de path dependendo da versão / reverse-proxy.
  // Mantemos uma lista bem abrangente e tentamos em ordem.
  const prefixes = ['', '/api', '/api/v1', '/v1'];
  const paths = [
    // mais comuns
    '/chat/send/text',
    '/chat/sendText',
    '/message/sendText',
    '/send/text',
    // variações vistas em alguns forks
    '/message/send/text',
    '/message/send',
    '/chat/send',
  ];

  const urls: string[] = [];

  for (const prefix of prefixes) {
    for (const path of paths) {
      // com e sem barra final (alguns proxies diferenciam)
      urls.push(`${baseUrl}${prefix}${path}/${encoded}`);
      urls.push(`${baseUrl}${prefix}${path}/${encoded}/`);

      // alguns servidores NÃO colocam a instância na URL (vem no body)
      urls.push(`${baseUrl}${prefix}${path}`);
      urls.push(`${baseUrl}${prefix}${path}/`);
    }
  }

  // dedupe preservando ordem
  return Array.from(new Set(urls));
}

interface SendChatMessagePayload {
  action: 'send_chat_message';
  instanceId: string;
  instanceName: string;
  chatId: string;
  remoteJid: string;
  message: string;
  timestamp: string;
}

interface SendMediaPayload {
  action: 'send_media';
  instanceId: string;
  instanceName: string;
  chatId: string;
  remoteJid: string;
  mediaType: 'image' | 'video' | 'document' | 'audio' | 'location' | 'contact';
  timestamp: string;
  // For file media
  fileBase64?: string;
  fileName?: string;
  fileMimeType?: string;
  caption?: string;
  // For location
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;
  // For contact
  contactName?: string;
  contactPhone?: string;
}

interface LegacyWhatsAppPayload {
  action: 'send' | 'test_connection' | 'process_queue' | 'receive_webhook';
  phone?: string;
  message?: string;
  lead_id?: string;
  template_id?: string;
  media_url?: string;
  webhook_data?: any;
}

type WhatsAppPayload = SendChatMessagePayload | SendMediaPayload | LegacyWhatsAppPayload;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: WhatsAppPayload = await req.json();

    console.log('[WhatsApp] Action received:', payload.action);

    // =========================================================================
    // NOVA AÇÃO: Enviar mensagem via UAZAPI (usado pelo CRM Chats Module)
    // =========================================================================
    if (payload.action === 'send_chat_message') {
      const { instanceId, instanceName, chatId, remoteJid, message, timestamp } = payload as SendChatMessagePayload;

      if (!instanceId || !remoteJid || !message) {
        return new Response(
          JSON.stringify({ success: false, error: 'instanceId, remoteJid e message são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Buscar a instância para pegar a api_key (se necessário)
      const { data: instance, error: instanceError } = await supabase
        .from('whatsapp_instances')
        .select('id, instance_name, api_key, organization_id')
        .eq('id', instanceId)
        .single();

      if (instanceError || !instance) {
        console.error('[WhatsApp] Instance not found:', instanceId);
        return new Response(
          JSON.stringify({ success: false, error: 'Instância não encontrada' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // Normalizar instance_name para URL do UAZAPI
      const uazapiInstanceName = instance.instance_name;

      const candidateUrls = buildUazapiCandidateUrls(UAZAPI_BASE_URL, uazapiInstanceName);

      console.log('[WhatsApp] Sending via UAZAPI:', {
        urls: candidateUrls,
        to: remoteJid,
        messageLength: message.length,
        instanceName: uazapiInstanceName
      });

      try {
        // Extrair número do remoteJid (formato: 5511999999999@s.whatsapp.net)
        const phoneNumber = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
        
        // UAZAPI aceita múltiplos formatos de payload - tentar formatos conhecidos
        // Formato 1: Phone + Body (wuzapi style)
        // Formato 2: chatId + text
        // Formato 3: number + message
        const uazapiPayload = {
          // Formato wuzapi/UAZAPI
          Phone: phoneNumber,
          Body: message,
          // Formatos alternativos (alguns servidores aceitam)
          chatId: remoteJid,
          text: message,
          number: phoneNumber,
          message: message,

          // Identificação da instância (para servidores que NÃO usam a instância no path)
          instance: uazapiInstanceName,
          instanceName: uazapiInstanceName,
          session: uazapiInstanceName,
        };

        console.log('[WhatsApp] UAZAPI payload:', { phoneNumber, messageLength: message.length, remoteJid });


        // Usar API key global do UAZAPI (configurada como secret)
      // Priorizar API key da instância, usar global apenas como fallback
      const apiKey = instance.api_key || UAZAPI_GLOBAL_API_KEY;
        
      if (!apiKey || apiKey === '') {
          console.error('[WhatsApp] No API key available for UAZAPI');
          return new Response(
          JSON.stringify({ success: false, error: `API key não encontrada para a instância ${uazapiInstanceName}. Configure o campo 'api_key' na instância ou defina UAZAPI_API_KEY global.` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      
      console.log('[WhatsApp] Using API key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NONE');

        // IMPORTANTE:
        // Diferentes instalações/proxies do UAZAPI esperam o token em headers diferentes.
        // Enviar múltiplos headers ao mesmo tempo pode causar ambiguidade (ex.: server prioriza Authorization).
        // Portanto, tentamos ESTRATÉGIAS em sequência: token -> apikey -> Authorization.
        const authStrategies: Array<{ name: string; headers: Record<string, string> }> = [
          {
            name: 'token',
            headers: {
              'Content-Type': 'application/json',
              'token': apiKey,
            },
          },
          {
            name: 'apikey',
            headers: {
              'Content-Type': 'application/json',
              'apikey': apiKey,
            },
          },
          {
            name: 'authorization_bearer',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
          },
        ];

        let lastAttempt: { url: string; status?: number; result?: any } | null = null;
        let okResponse: { url: string; status: number; result: any } | null = null;

        for (const url of candidateUrls) {
          for (const strategy of authStrategies) {
            console.log('[WhatsApp] Trying UAZAPI send:', { url, auth: strategy.name });

            const response = await fetch(url, {
              method: 'POST',
              headers: strategy.headers,
              body: JSON.stringify(uazapiPayload)
            });

            const result = await safeJsonFromResponse(response);
            const success = response.ok;

            console.log('[WhatsApp] UAZAPI response:', {
              url,
              auth: strategy.name,
              status: response.status,
              success,
              result
            });

            lastAttempt = { url, status: response.status, result };

            if (success) {
              okResponse = { url, status: response.status, result };
              break;
            }

            // Se endpoint existe mas auth falhou, não adianta tentar outros endpoints.
            // Porém pode valer tentar o PRÓXIMO header (token/apikey/bearer).
            // Então aqui só "break" do loop de endpoints para 404/405.
            if ([404, 405].includes(response.status)) {
              // tenta próximo endpoint (mesma estratégia já falhou por inexistência)
              break;
            }

            // 401/403/400/500 etc: tenta próxima estratégia de auth
          }

          if (okResponse) break;

          // Se não foi 404/405 no último attempt deste URL, não faz sentido tentar outros URLs.
          if (lastAttempt?.status && ![404, 405].includes(lastAttempt.status)) {
            break;
          }
        }

        if (okResponse) {
          // Salvar mensagem enviada no banco
          const messageTimestamp = new Date().toISOString();
          const result = okResponse.result;
          const messageId = result?.key?.id || result?.messageId || `sent_${Date.now()}`;

          const { error: saveError } = await supabase
            .from('whatsapp_messages')
            .insert({
              chat_id: chatId,
              message_id: messageId,
              from_me: true,
              sender_name: uazapiInstanceName,
              content: message,
              message_type: 'text',
              message_timestamp: messageTimestamp,
              status: 'sent',
              raw_data: { sent_via: 'crm', uazapi_response: result }
            });

          if (saveError) {
            console.error('[WhatsApp] Error saving sent message:', saveError);
          }

          // Atualizar last_message_timestamp do chat
          await supabase
            .from('whatsapp_chats')
            .update({
              last_message_timestamp: messageTimestamp,
              updated_at: messageTimestamp
            })
            .eq('id', chatId);

          return new Response(
            JSON.stringify({ 
              success: true, 
              message_id: messageId,
              sent_at: messageTimestamp,
              provider_status: okResponse.status,
              provider_url: okResponse.url
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.error('[WhatsApp] UAZAPI send failed:', lastAttempt);
          // Retornamos 200 + success:false para o frontend conseguir ler o erro detalhado.
          return new Response(
            JSON.stringify({
              success: false,
              error: lastAttempt?.result?.message || `Falha ao enviar via UAZAPI (${lastAttempt?.status ?? 'unknown'})`,
              provider_status: lastAttempt?.status,
              provider_url: lastAttempt?.url,
              provider_response: lastAttempt?.result,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      } catch (sendError: any) {
        console.error('[WhatsApp] UAZAPI request error:', sendError);
        return new Response(
          JSON.stringify({ success: false, error: sendError?.message || 'Erro de conexão com UAZAPI' }),
          // 200 para o frontend conseguir ler a mensagem detalhada.
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // =========================================================================
    // NOVA AÇÃO: Enviar mídia via UAZAPI (imagens, vídeos, documentos, localização, contatos)
    // =========================================================================
    if (payload.action === 'send_media') {
      const mediaPayload = payload as SendMediaPayload;
      const { 
        instanceId, 
        instanceName, 
        chatId, 
        remoteJid, 
        mediaType,
        fileBase64,
        fileName,
        fileMimeType,
        caption,
        latitude,
        longitude,
        locationName,
        locationAddress,
        contactName,
        contactPhone
      } = mediaPayload;

      if (!instanceId || !remoteJid || !mediaType) {
        return new Response(
          JSON.stringify({ success: false, error: 'instanceId, remoteJid e mediaType são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Buscar a instância
      const { data: instance, error: instanceError } = await supabase
        .from('whatsapp_instances')
        .select('id, instance_name, api_key, organization_id')
        .eq('id', instanceId)
        .single();

      if (instanceError || !instance) {
        return new Response(
          JSON.stringify({ success: false, error: 'Instância não encontrada' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      const uazapiInstanceName = instance.instance_name;
      const apiKey = instance.api_key || UAZAPI_GLOBAL_API_KEY;

      if (!apiKey) {
        return new Response(
          JSON.stringify({ success: false, error: `API key não encontrada para ${uazapiInstanceName}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const phoneNumber = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
      const encoded = encodeURIComponent(uazapiInstanceName);

      console.log('[WhatsApp] Sending media:', { mediaType, instanceName: uazapiInstanceName, phoneNumber });

      try {
        let uazapiPayload: any = {};
        let mediaEndpoints: string[] = [];

        // WUZAPI/UAZAPI endpoints - documentação oficial:
        // - Image: POST /chat/send/image com { Phone, Image (base64 data uri), Caption }
        // - Video: POST /chat/send/video com { Phone, Video (base64 data uri), Caption }
        // - Document: POST /chat/send/document com { Phone, Document (base64 data uri), FileName }
        // - Audio: POST /chat/send/audio com { Phone, Audio (base64 data uri) }
        // - Location: POST /chat/send/location com { Phone, Latitude, Longitude, Name }
        // - Contact: POST /chat/send/contact com { Phone, Name, Vcard }
        
        // A UAZAPI pode ter instância no path OU usar token para identificar sessão
        // Tentamos AMBAS abordagens
        
        // Configurar payload e endpoints por tipo de mídia
        // Construir data URI se necessário
        const ensureDataUri = (base64: string | undefined, mimeType: string): string => {
          if (!base64) return '';
          return base64.startsWith('data:') ? base64 : `data:${mimeType};base64,${base64}`;
        };

         // Gerar todas as variações de endpoints - PRIORIZAR endpoints SEM prefixo (padrão UAZAPI)
         // Texto funciona com /send/text, então /send/image deve funcionar igual
         const buildAllMediaEndpoints = (mediaPaths: string[]): string[] => {
           const urls: string[] = [];

           // PRIMEIRO: tentar endpoints SEM prefixo (padrão UAZAPI que funciona para texto)
           for (const mediaPath of mediaPaths) {
             urls.push(`${UAZAPI_BASE_URL}${mediaPath}`);
           }

           // DEPOIS: tentar com prefixos comuns
           const prefixes = ['/v1', '/api/v1', '/api', ''];
           for (const prefix of prefixes) {
             for (const mediaPath of mediaPaths) {
               if (prefix === '') continue; // já adicionado acima
               urls.push(`${UAZAPI_BASE_URL}${prefix}${mediaPath}`);
               urls.push(`${UAZAPI_BASE_URL}${prefix}/${encoded}${mediaPath}`);
             }
           }

           // dedupe preservando ordem
           return Array.from(new Set(urls));
         };

        switch (mediaType) {
          case 'image':
            const imageDataUri = ensureDataUri(fileBase64, fileMimeType || 'image/jpeg');
            mediaEndpoints = buildAllMediaEndpoints([
              '/chat/send/image',
              '/chat/sendImage',
              '/message/send/image',
              '/message/sendImage',
              '/send/image',
              '/sendImage',
            ]);
            uazapiPayload = {
              Phone: phoneNumber,
              Image: imageDataUri,
              Caption: caption || '',
              // Formatos alternativos que alguns servidores aceitam
              phone: phoneNumber,
              image: imageDataUri,
              caption: caption || '',
              base64: imageDataUri,
              filename: fileName || 'image.jpg',
            };
            break;

          case 'video':
            const videoDataUri = ensureDataUri(fileBase64, fileMimeType || 'video/mp4');
            mediaEndpoints = buildAllMediaEndpoints([
              '/chat/send/video',
              '/chat/sendVideo',
              '/message/send/video',
              '/message/sendVideo',
              '/send/video',
              '/sendVideo',
            ]);
            uazapiPayload = {
              Phone: phoneNumber,
              Video: videoDataUri,
              Caption: caption || '',
              phone: phoneNumber,
              video: videoDataUri,
              caption: caption || '',
              base64: videoDataUri,
              filename: fileName || 'video.mp4',
            };
            break;

          case 'document':
            const docDataUri = ensureDataUri(fileBase64, fileMimeType || 'application/octet-stream');
            mediaEndpoints = buildAllMediaEndpoints([
              '/chat/send/document',
              '/chat/sendDocument',
              '/message/send/document',
              '/message/sendDocument',
              '/send/document',
              '/sendDocument',
            ]);
            uazapiPayload = {
              Phone: phoneNumber,
              Document: docDataUri,
              FileName: fileName || 'document',
              Caption: caption || '',
              phone: phoneNumber,
              document: docDataUri,
              filename: fileName || 'document',
              caption: caption || '',
              base64: docDataUri,
            };
            break;

          case 'audio':
            const audioDataUri = ensureDataUri(fileBase64, fileMimeType || 'audio/ogg');
            mediaEndpoints = buildAllMediaEndpoints([
              '/chat/send/audio',
              '/chat/sendAudio',
              '/message/send/audio',
              '/message/sendAudio',
              '/send/audio',
              '/sendAudio',
            ]);
            uazapiPayload = {
              Phone: phoneNumber,
              Audio: audioDataUri,
              phone: phoneNumber,
              audio: audioDataUri,
              base64: audioDataUri,
              filename: fileName || 'audio.ogg',
            };
            break;

          case 'location':
            mediaEndpoints = buildAllMediaEndpoints([
              '/chat/send/location',
              '/chat/sendLocation',
              '/message/send/location',
              '/message/sendLocation',
              '/send/location',
              '/sendLocation',
            ]);
            uazapiPayload = {
              Phone: phoneNumber,
              Latitude: latitude,
              Longitude: longitude,
              Name: locationName || '',
              phone: phoneNumber,
              latitude: latitude,
              longitude: longitude,
              name: locationName || '',
              address: locationAddress || '',
            };
            break;

          case 'contact':
            const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${contactName}\nTEL;type=CELL;type=pref:${contactPhone}\nEND:VCARD`;
            mediaEndpoints = buildAllMediaEndpoints([
              '/chat/send/contact',
              '/chat/sendContact',
              '/message/send/contact',
              '/message/sendContact',
              '/send/contact',
              '/sendContact',
            ]);
            uazapiPayload = {
              Phone: phoneNumber,
              Name: contactName || 'Contato',
              Vcard: vcard,
              phone: phoneNumber,
              name: contactName || 'Contato',
              vcard: vcard,
              contact: { name: contactName, phone: contactPhone },
            };
            break;

          default:
            return new Response(
              JSON.stringify({ success: false, error: `Tipo de mídia não suportado: ${mediaType}` }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }
        
        console.log('[WhatsApp] Media endpoints to try:', mediaEndpoints.length);

        // Estratégias de autenticação - MESMA ordem que funciona para texto
        const authStrategies: Array<{ name: string; headers: Record<string, string> }> = [
          { name: 'token', headers: { 'Content-Type': 'application/json', 'token': apiKey } },
          { name: 'apikey', headers: { 'Content-Type': 'application/json', 'apikey': apiKey } },
          { name: 'authorization_bearer', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` } },
        ];

        let lastAttempt: { url: string; status?: number; result?: any } | null = null;
        let okResponse: { url: string; status: number; result: any } | null = null;

        // Importante: 404/405 aqui significam “esse endpoint/método não serve”; devemos tentar os outros.
        // Só paramos de varrer endpoints quando recebemos um status que indica que o endpoint existe (ex.: 401/403/400).
        for (const url of mediaEndpoints) {
          let shouldTryNextUrl = false;

          for (const strategy of authStrategies) {
            console.log('[WhatsApp] Trying media send:', { url, auth: strategy.name, mediaType, method: 'POST' });

            // 1) POST
            let response = await fetch(url, {
              method: 'POST',
              headers: {
                ...strategy.headers,
                Accept: 'application/json',
              },
              body: JSON.stringify(uazapiPayload),
            });

            let result = await safeJsonFromResponse(response);
            lastAttempt = { url, status: response.status, result };

            console.log('[WhatsApp] Media response:', { url, status: response.status, success: response.ok, method: 'POST' });

            if (response.ok) {
              okResponse = { url, status: response.status, result };
              break;
            }

            // 2) Se POST não é permitido, tenta PUT uma única vez.
            if (response.status === 405) {
              console.log('[WhatsApp] Trying media send:', { url, auth: strategy.name, mediaType, method: 'PUT' });

              response = await fetch(url, {
                method: 'PUT',
                headers: {
                  ...strategy.headers,
                  Accept: 'application/json',
                },
                body: JSON.stringify(uazapiPayload),
              });

              result = await safeJsonFromResponse(response);
              lastAttempt = { url, status: response.status, result };

              console.log('[WhatsApp] Media response:', { url, status: response.status, success: response.ok, method: 'PUT' });

              if (response.ok) {
                okResponse = { url, status: response.status, result };
                break;
              }
            }

            // 404/405: endpoint/método não serve → tenta PRÓXIMO URL (não vale tentar outras auth strategies)
            if (lastAttempt?.status === 404 || lastAttempt?.status === 405) {
              shouldTryNextUrl = true;
              break;
            }

            // Outros status (401/403/400/5xx): endpoint existe → tenta próxima estratégia de auth.
          }

          if (okResponse) break;
          if (shouldTryNextUrl) continue;

          // Se chegamos aqui sem okResponse e não é 404/405, não faz sentido tentar outros URLs.
          if (lastAttempt?.status && lastAttempt.status !== 404 && lastAttempt.status !== 405) break;
        }

        if (okResponse) {
          const messageTimestamp = new Date().toISOString();
          const result = okResponse.result;
          const messageId = result?.key?.id || result?.messageId || `sent_media_${Date.now()}`;

          // Determinar conteúdo para salvar
          let savedContent = '';
          if (mediaType === 'location') {
            savedContent = `📍 ${locationName || 'Localização'}`;
          } else if (mediaType === 'contact') {
            savedContent = `👤 ${contactName}`;
          } else {
            savedContent = caption || `[${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}]`;
          }

          // Salvar mensagem enviada
          await supabase.from('whatsapp_messages').insert({
            chat_id: chatId,
            message_id: messageId,
            from_me: true,
            sender_name: uazapiInstanceName,
            content: savedContent,
            message_type: mediaType,
            message_timestamp: messageTimestamp,
            status: 'sent',
            raw_data: { 
              sent_via: 'crm', 
              media_type: mediaType,
              file_name: fileName,
              uazapi_response: result 
            }
          });

          // Atualizar chat
          await supabase.from('whatsapp_chats').update({
            last_message_timestamp: messageTimestamp,
            updated_at: messageTimestamp
          }).eq('id', chatId);

          return new Response(
            JSON.stringify({ success: true, message_id: messageId, sent_at: messageTimestamp }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.error('[WhatsApp] Media send failed:', lastAttempt);
          return new Response(
            JSON.stringify({
              success: false,
              error: lastAttempt?.result?.message || `Falha ao enviar ${mediaType}`,
              provider_status: lastAttempt?.status,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      } catch (mediaError: any) {
        console.error('[WhatsApp] Media request error:', mediaError);
        return new Response(
          JSON.stringify({ success: false, error: mediaError?.message || 'Erro ao enviar mídia' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // =========================================================================
    // AÇÕES LEGADAS (compatibilidade com whatsapp_config - Evolution/Z-API)
    // =========================================================================
    
    // Buscar configuração ativa do WhatsApp (legacy)
    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (!config && payload.action !== 'receive_webhook') {
      return new Response(
        JSON.stringify({ success: false, error: 'WhatsApp não configurado (legacy mode)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Testar conexão (legacy)
    if (payload.action === 'test_connection') {
      try {
        let testUrl = '';
        let headers: Record<string, string> = {};

        if (config.provider === 'evolution') {
          testUrl = `${config.api_url}/instance/connectionState/${config.instance_id}`;
          headers = { 'apikey': config.api_key };
        } else if (config.provider === 'z-api') {
          testUrl = `${config.api_url}/${config.instance_id}/status`;
          headers = { 'Client-Token': config.api_key };
        } else if (config.provider === 'wppconnect') {
          testUrl = `${config.api_url}/api/${config.instance_id}/status-session`;
          headers = { 'Authorization': `Bearer ${config.api_key}` };
        }

        const response = await fetch(testUrl, { headers });
        const data = await response.json();
        
        const isConnected = response.ok && (
          data.state === 'open' || 
          data.connected === true || 
          data.status === 'CONNECTED'
        );

        await supabase
          .from('whatsapp_config')
          .update({
            connection_status: isConnected ? 'connected' : 'disconnected',
            last_connection_check: new Date().toISOString()
          })
          .eq('id', config.id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            connected: isConnected,
            provider: config.provider,
            raw_response: data
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        await supabase
          .from('whatsapp_config')
          .update({
            connection_status: 'error',
            last_connection_check: new Date().toISOString()
          })
          .eq('id', config.id);

        return new Response(
          JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    // Enviar mensagem (legacy)
    if (payload.action === 'send') {
      const legacyPayload = payload as LegacyWhatsAppPayload;
      
      if (!legacyPayload.phone || !legacyPayload.message) {
        return new Response(
          JSON.stringify({ success: false, error: 'Phone e message são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      let phone = legacyPayload.phone.replace(/\D/g, '');
      if (!phone.startsWith('55')) phone = '55' + phone;

      let sendUrl = '';
      let sendBody: any = {};
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (config.provider === 'evolution') {
        sendUrl = `${config.api_url}/message/sendText/${config.instance_id}`;
        headers['apikey'] = config.api_key;
        sendBody = {
          number: phone,
          text: legacyPayload.message
        };
        if (legacyPayload.media_url) {
          sendUrl = `${config.api_url}/message/sendMedia/${config.instance_id}`;
          sendBody = {
            number: phone,
            mediatype: 'image',
            media: legacyPayload.media_url,
            caption: legacyPayload.message
          };
        }
      } else if (config.provider === 'z-api') {
        sendUrl = `${config.api_url}/${config.instance_id}/send-text`;
        headers['Client-Token'] = config.api_key;
        sendBody = {
          phone: phone,
          message: legacyPayload.message
        };
        if (legacyPayload.media_url) {
          sendUrl = `${config.api_url}/${config.instance_id}/send-image`;
          sendBody = {
            phone: phone,
            image: legacyPayload.media_url,
            caption: legacyPayload.message
          };
        }
      } else if (config.provider === 'wppconnect') {
        sendUrl = `${config.api_url}/api/${config.instance_id}/send-message`;
        headers['Authorization'] = `Bearer ${config.api_key}`;
        sendBody = {
          phone: phone,
          message: legacyPayload.message
        };
      }

      try {
        const response = await fetch(sendUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(sendBody)
        });

        const result = await response.json();
        const success = response.ok;

        await supabase
          .from('whatsapp_dispatch_queue')
          .insert({
            lead_id: legacyPayload.lead_id,
            phone: phone,
            message: legacyPayload.message,
            template_id: legacyPayload.template_id,
            status: success ? 'sent' : 'failed',
            sent_at: success ? new Date().toISOString() : null,
            error_message: success ? null : JSON.stringify(result)
          });

        if (legacyPayload.lead_id) {
          await supabase
            .from('crm_lead_history')
            .insert({
              lead_id: legacyPayload.lead_id,
              action: 'whatsapp_sent',
              description: `Mensagem WhatsApp enviada: ${legacyPayload.message.substring(0, 100)}...`,
              metadata: { phone, success, provider: config.provider }
            });
        }

        return new Response(
          JSON.stringify({ success, result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    // Processar fila de mensagens pendentes (legacy)
    if (payload.action === 'process_queue') {
      const { data: pendingMessages } = await supabase
        .from('whatsapp_dispatch_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(50);

      let sent = 0;
      let failed = 0;

      for (const msg of pendingMessages || []) {
        const sendResult = await fetch(req.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send',
            phone: msg.phone,
            message: msg.message,
            lead_id: msg.lead_id,
            template_id: msg.template_id
          })
        });

        const result = await sendResult.json();
        if (result.success) {
          sent++;
        } else {
          failed++;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return new Response(
        JSON.stringify({ success: true, sent, failed, total: pendingMessages?.length || 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Receber webhook (legacy)
    if (payload.action === 'receive_webhook') {
      const legacyPayload = payload as LegacyWhatsAppPayload;
      const webhookData = legacyPayload.webhook_data;
      
      if (!webhookData) {
        return new Response(
          JSON.stringify({ success: false, error: 'Dados do webhook não fornecidos' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      let phone = '';
      let message = '';
      let messageId = '';

      if (webhookData.data?.key?.remoteJid) {
        phone = webhookData.data.key.remoteJid.replace('@s.whatsapp.net', '');
        message = webhookData.data.message?.conversation || 
                  webhookData.data.message?.extendedTextMessage?.text || '';
        messageId = webhookData.data.key.id;
      } else if (webhookData.phone) {
        phone = webhookData.phone;
        message = webhookData.text?.message || webhookData.message || '';
        messageId = webhookData.messageId || '';
      }

      if (phone && message) {
        const { data: lead } = await supabase
          .from('crm_leads')
          .select('id, name, assigned_to')
          .or(`phone.eq.${phone},whatsapp.eq.${phone}`)
          .single();

        await supabase
          .from('crm_chat_messages')
          .insert({
            lead_id: lead?.id,
            content: message,
            sender_id: 'external',
            sender_name: lead?.name || phone,
            message_type: 'received',
            metadata: { phone, messageId, raw: webhookData }
          });

        if (lead) {
          await supabase
            .from('crm_tasks')
            .insert({
              lead_id: lead.id,
              title: `Responder mensagem WhatsApp`,
              description: `Mensagem recebida: ${message.substring(0, 200)}`,
              due_date: new Date().toISOString(),
              assigned_to: lead.assigned_to,
              priority: 'high'
            });

          if (lead.assigned_to) {
            await supabase
              .from('notifications')
              .insert({
                user_id: lead.assigned_to,
                title: '📱 Nova mensagem WhatsApp',
                message: `${lead.name}: ${message.substring(0, 100)}...`,
                type: 'whatsapp_received'
              });
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, processed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação não reconhecida' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
