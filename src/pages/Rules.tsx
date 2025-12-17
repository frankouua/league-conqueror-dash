import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Trophy, 
  Target, 
  Star, 
  DollarSign, 
  MessageSquare, 
  Users, 
  Video, 
  Instagram,
  Award,
  TrendingUp,
  Gift,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles
} from "lucide-react";
import copaLogo from "@/assets/logo-copa-unique-league.png";
import mascoteLogo from "@/assets/mascote-leao-dourado.png";
import cardsSystem from "@/assets/cards-system.png";

const Rules = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <img 
            src={copaLogo} 
            alt="Copa Unique League 2026" 
            className="w-32 h-32 mx-auto mb-6 drop-shadow-lg"
          />
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-2">
            Copa Unique League 2026
          </h1>
          <p className="text-xl text-muted-foreground">
            A Disputa pela Excelência CPI
          </p>
          <p className="text-lg text-primary/80 mt-2 font-semibold">
            Regulamento Oficial
          </p>
        </div>

        {/* Period */}
        <Card className="mb-8 border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-3">
              <Calendar className="w-6 h-6 text-primary" />
              <span className="text-xl font-semibold">
                Período: Janeiro a Dezembro de 2026
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Points */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <DollarSign className="w-7 h-7 text-green-500" />
              Pontuação por Faturamento (80%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-r from-green-500/10 to-green-500/5 p-6 rounded-lg">
              <div className="flex items-center gap-4 mb-4">
                <TrendingUp className="w-10 h-10 text-green-500" />
                <div>
                  <p className="text-3xl font-bold text-green-600">1 ponto</p>
                  <p className="text-lg text-muted-foreground">a cada R$ 10.000 faturados</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                O faturamento é a base principal da competição, representando 80% do peso na pontuação total.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quality Indicators */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Star className="w-7 h-7 text-primary" />
              Indicadores de Qualidade (20%)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* NPS */}
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                NPS (Net Promoter Score)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                  <span>NPS nota 9</span>
                  <Badge variant="secondary" className="bg-blue-500/20">3 pontos</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                  <span>NPS nota 10</span>
                  <Badge variant="secondary" className="bg-blue-500/20">5 pontos</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg md:col-span-2">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Bônus se citou membro da equipe
                  </span>
                  <Badge className="bg-primary">+10 pontos</Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Testimonials */}
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 text-yellow-500" />
                Depoimentos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg text-center">
                  <Award className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <p className="font-semibold">Avaliação Google</p>
                  <Badge className="mt-2 bg-orange-500">10 pontos</Badge>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg text-center">
                  <Video className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <p className="font-semibold">Vídeo Depoimento</p>
                  <Badge className="mt-2 bg-purple-500">20 pontos</Badge>
                </div>
                <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg text-center border border-primary/30">
                  <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="font-semibold">Depoimento Gold</p>
                  <Badge className="mt-2 bg-primary">40 pontos</Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Referrals */}
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-cyan-500" />
                Indicações
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center justify-between p-3 bg-cyan-500/10 rounded-lg">
                  <span>Coletada</span>
                  <Badge variant="secondary" className="bg-cyan-500/20">5 pontos</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-cyan-500/15 rounded-lg">
                  <span>Converteu em Consulta</span>
                  <Badge variant="secondary" className="bg-cyan-500/30">15 pontos</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-cyan-500/20 rounded-lg">
                  <span>Converteu em Cirurgia</span>
                  <Badge className="bg-cyan-500">30 pontos</Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Other Indicators */}
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-pink-500" />
                Outros Indicadores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center justify-between p-3 bg-pink-500/10 rounded-lg">
                  <span>UniLovers</span>
                  <Badge variant="secondary" className="bg-pink-500/20">5 pontos</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-pink-500/15 rounded-lg">
                  <span>Embaixadora</span>
                  <Badge className="bg-pink-500">50 pontos</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-pink-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    <span>Menção Instagram</span>
                  </div>
                  <Badge variant="secondary" className="bg-pink-500/20">2 pontos</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clinic Goals */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Gift className="w-7 h-7 text-emerald-500" />
              Metas Coletivas da Clínica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Quando a clínica atinge as metas de faturamento, AMBAS as equipes ganham bônus:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-lg text-center border border-emerald-500/20">
                <p className="text-2xl font-bold text-emerald-600">R$ 2.500.000</p>
                <p className="text-sm text-muted-foreground mb-2">Meta 1</p>
                <Badge className="bg-emerald-500">+50 pontos cada equipe</Badge>
              </div>
              <div className="p-4 bg-gradient-to-br from-emerald-500/15 to-emerald-500/10 rounded-lg text-center border border-emerald-500/30">
                <p className="text-2xl font-bold text-emerald-600">R$ 2.700.000</p>
                <p className="text-sm text-muted-foreground mb-2">Meta 2</p>
                <Badge className="bg-emerald-500">+50 pontos cada equipe</Badge>
              </div>
              <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg text-center border border-primary/30">
                <p className="text-2xl font-bold text-primary">R$ 3.000.000</p>
                <p className="text-sm text-muted-foreground mb-2">Meta Final</p>
                <Badge className="bg-primary">+100 pontos cada equipe</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards System */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <AlertTriangle className="w-7 h-7 text-yellow-500" />
              Sistema de Cartões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                {/* Blue Card */}
                <div className="flex items-center gap-4 p-4 bg-blue-500/10 rounded-lg border-l-4 border-blue-500">
                  <div className="w-12 h-16 bg-blue-500 rounded shadow-lg" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-600">Cartão Azul</p>
                    <p className="text-sm text-muted-foreground">Excelência no atendimento</p>
                  </div>
                  <Badge className="bg-blue-500 text-lg">+20 pts</Badge>
                </div>

                {/* White Card */}
                <div className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg border-l-4 border-gray-400">
                  <div className="w-12 h-16 bg-white border-2 border-gray-300 rounded shadow-lg" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-600 dark:text-gray-300">Cartão Branco</p>
                    <p className="text-sm text-muted-foreground">Bom desempenho geral</p>
                  </div>
                  <Badge variant="secondary" className="text-lg">+10 pts</Badge>
                </div>

                {/* Yellow Card */}
                <div className="flex items-center gap-4 p-4 bg-yellow-500/10 rounded-lg border-l-4 border-yellow-500">
                  <div className="w-12 h-16 bg-yellow-400 rounded shadow-lg" />
                  <div className="flex-1">
                    <p className="font-semibold text-yellow-600">Cartão Amarelo</p>
                    <p className="text-sm text-muted-foreground">Advertência</p>
                  </div>
                  <Badge className="bg-yellow-500 text-lg">-15 pts</Badge>
                </div>

                {/* Red Card */}
                <div className="flex items-center gap-4 p-4 bg-red-500/10 rounded-lg border-l-4 border-red-500">
                  <div className="w-12 h-16 bg-red-500 rounded shadow-lg" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-600">Cartão Vermelho</p>
                    <p className="text-sm text-muted-foreground">Infração grave</p>
                  </div>
                  <Badge variant="destructive" className="text-lg">-40 pts</Badge>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <img 
                  src={cardsSystem} 
                  alt="Sistema de Cartões" 
                  className="max-w-full h-auto rounded-lg shadow-lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prizes */}
        <Card className="mb-8 border-primary/30">
          <CardHeader className="bg-gradient-to-r from-primary/20 to-primary/10">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Trophy className="w-7 h-7 text-primary" />
              Premiações
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg border border-primary/30 text-center">
                <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Equipe Campeã</h3>
                <p className="text-muted-foreground mb-4">A equipe com mais pontos ao final do ano</p>
                <div className="space-y-2">
                  <Badge className="bg-primary text-lg px-4 py-1">Troféu Copa Unique League</Badge>
                  <p className="text-sm text-muted-foreground">+ Prêmios especiais a serem revelados</p>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-lg border border-amber-500/20 text-center">
                <Award className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Destaques Individuais</h3>
                <p className="text-muted-foreground mb-4">Reconhecimento dos melhores desempenhos</p>
                <div className="space-y-2">
                  <Badge variant="secondary" className="bg-amber-500/20">Maior Faturamento</Badge>
                  <Badge variant="secondary" className="bg-amber-500/20">Mais Indicações</Badge>
                  <Badge variant="secondary" className="bg-amber-500/20">Melhor NPS</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Rules */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <CheckCircle2 className="w-7 h-7 text-green-500" />
              Regras Importantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Todos os registros devem ser feitos no sistema até o último dia útil de cada mês</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Depoimentos e indicações precisam de comprovação para validação</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Cartões são aplicados exclusivamente pela coordenação</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>A pontuação é atualizada em tempo real no sistema</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Casos omissos serão decididos pela coordenação</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-primary font-semibold text-lg">
            Que vença a melhor equipe! 🏆
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            Copa Unique League 2026 - Unique CPI
          </p>
        </div>
      </main>
    </div>
  );
};

export default Rules;
