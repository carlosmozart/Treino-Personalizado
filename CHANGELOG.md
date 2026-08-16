# Changelog — Treino Personalizado

Todas as mudanças relevantes do app ficam registradas aqui. Ao lançar uma nova versão:
1. Suba o número em `APP_VERSION` (dentro do `<script>` do `index.html`, exibido no rodapé)
2. Suba o número em `CACHE_NAME` no `sw.js` (ex: `treino-cache-v3`) — isso força o Chrome a
   atualizar o app instalado
3. Adicione uma entrada aqui, nesse formato

## [1.3.0] - 2026-08-15
### Adicionado
- **Sistema de XP e Níveis (1 a 100)**: barra de nível fixa no cabeçalho, XP calculado por
  check-in de treino
- **Check-in automático**: marcar todos os exercícios do dia como concluídos gera check-in
  automático com XP cheio (100 XP)
- **Check-in manual parcial**: usar "Finalizar Treino" sem ter concluído todos os exercícios
  concede metade do XP (50 XP); desmarcar um check-in no calendário revoga o XP concedido
- **Aba "Perfil"**: dados pessoais (nome, idade, altura, peso, nível de atividade)
- Cálculo de IMC com classificação (OMS) e indicador visual
- Meta de água diária calculada a partir do peso e nível de atividade, com botões de
  +100ml/-100ml e bônus de +2 XP ao bater a meta do dia
- Histórico de peso e IMC por data, registrado automaticamente ao salvar o perfil
### Observação
- Gestão de múltiplos perfis de treino (dias/semana configuráveis, exercícios customizados,
  limite de 10 por dia) fica para a próxima versão — é uma reestruturação maior do banco de
  dados de treinos


### Adicionado
- Sistema de versionamento e este changelog
- Número da versão exibido no rodapé do app

## [1.1.1] - 2026-08-14
### Corrigido
- Cache do service worker (`chassi-cache-v1` → `treino-cache-v2`) para garantir que
  atualizações publicadas no GitHub Pages realmente cheguem ao app já instalado

## [1.1.0] - 2026-08-14
### Alterado
- Renomeado de "Projeto Chassi 80kg" para "Treino Personalizado - Hipertrofia e Emagrecimento"
- Removidos termos de jargão militar/mecânico ("chassi", "torque", "blindagem", "extração",
  "diário de bordo", "combate", "tático") por linguagem padrão de musculação
- Grade de check-in mudou de vertical/6 dias para horizontal 4+3, incluindo domingo
  como dia extra opcional
### Adicionado
- Carregamento automático do treino correspondente ao dia da semana atual
- Contador de dias treinados no mês corrente
- Checkbox de "concluído" em cada card de exercício
- Botão de -5kg (simétrico ao +5kg já existente)
- Animações de entrada nos cards, pulso no dia atual do check-in, pop ao marcar
  check-in/exercício concluído

## [1.0.0] - 2026-08-07
### Adicionado
- Primeira versão como PWA instalável (manifest.json + service worker)
- Persistência via localStorage (histórico de séries/reps/carga por exercício)
- Sistema de check-in semanal com contador de sequência (streak)
- Marcador persistente de "hora de subir carga" baseado na última sessão registrada
- Plano de treino PPL 2x/semana adaptado (ênfase em peitoral inferior, restrições de
  joelho/escoliose, alternativas de exercício por limitação de equipamento)
