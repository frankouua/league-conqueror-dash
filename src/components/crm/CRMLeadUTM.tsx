import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Target, MousePointer, Hash, FileText, Link2, ExternalLink } from 'lucide-react';

interface UTMData {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  landing_page?: string | null;
  referrer_url?: string | null;
}

interface CRMLeadUTMProps {
  utmData: UTMData;
}

export function CRMLeadUTM({ utmData }: CRMLeadUTMProps) {
  const hasAnyData = Object.values(utmData).some(v => v);

  if (!hasAnyData) {
    return null;
  }

  const utmItems = [
    { key: 'utm_source', label: 'Fonte', icon: Globe, value: utmData.utm_source },
    { key: 'utm_medium', label: 'Mídia', icon: Target, value: utmData.utm_medium },
    { key: 'utm_campaign', label: 'Campanha', icon: MousePointer, value: utmData.utm_campaign },
    { key: 'utm_term', label: 'Termo', icon: Hash, value: utmData.utm_term },
    { key: 'utm_content', label: 'Conteúdo', icon: FileText, value: utmData.utm_content },
  ].filter(item => item.value);

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      google: 'bg-blue-500',
      facebook: 'bg-blue-600',
      instagram: 'bg-pink-500',
      tiktok: 'bg-black',
      youtube: 'bg-red-500',
      linkedin: 'bg-blue-700',
      twitter: 'bg-sky-500',
      email: 'bg-yellow-500',
      organic: 'bg-green-500',
      direct: 'bg-gray-500',
    };
    
    const lowerSource = source.toLowerCase();
    for (const [key, color] of Object.entries(colors)) {
      if (lowerSource.includes(key)) {
        return color;
      }
    }
    return 'bg-purple-500';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          Origem (UTM)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Main UTM Tags */}
        {utmItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {utmItems.map(item => {
              const Icon = item.icon;
              return (
                <Badge 
                  key={item.key} 
                  variant="secondary"
                  className={`gap-1 ${item.key === 'utm_source' ? getSourceColor(item.value!) : ''} ${item.key === 'utm_source' ? 'text-white' : ''}`}
                >
                  <Icon className="h-3 w-3" />
                  {item.label}: {item.value}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Landing Page */}
        {utmData.landing_page && (
          <div className="flex items-center gap-2 text-sm">
            <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Landing:</span>
            <a 
              href={utmData.landing_page}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline truncate flex items-center gap-1"
            >
              {new URL(utmData.landing_page).pathname || utmData.landing_page}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Referrer */}
        {utmData.referrer_url && (
          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Referência:</span>
            <a 
              href={utmData.referrer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline truncate flex items-center gap-1"
            >
              {(() => {
                try {
                  return new URL(utmData.referrer_url).hostname;
                } catch {
                  return utmData.referrer_url;
                }
              })()}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Campaign Summary */}
        {utmData.utm_campaign && (
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">Campanha Ativa</div>
            <div className="font-medium">{utmData.utm_campaign}</div>
            {utmData.utm_source && utmData.utm_medium && (
              <div className="text-xs text-muted-foreground mt-1">
                {utmData.utm_source} / {utmData.utm_medium}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
