// Catálogo de conquistas com leitura do estado atual, inclusive após restaurar backup.
window.TREINO_ACHIEVEMENTS = {
  create({ getCheckins, getGamification, getProfile, getLevelInfo, getTotalVolume }) {
    return [
      { id: 'primeiro_checkin', name: 'Primeiro Passo', desc: 'Complete seu primeiro check-in.', icon: '🥇', target: 1, current: () => Object.keys(getCheckins()).length },
      { id: 'checkins_10', name: 'Ganhando Ritmo', desc: 'Complete 10 check-ins no total.', icon: '🔥', target: 10, current: () => Object.keys(getCheckins()).length },
      { id: 'checkins_30', name: 'A Vontade do Fogo', desc: 'Alcance um histórico de 30 check-ins totais no aplicativo.', icon: '🍥', target: 30, current: () => Object.keys(getCheckins()).length },
      { id: 'checkins_50', name: '50 Treinos', desc: 'Complete 50 check-ins no total.', icon: '💪', target: 50, current: () => Object.keys(getCheckins()).length },
      { id: 'checkins_100', name: 'Centurião', desc: 'Complete 100 check-ins no total.', icon: '🏛️', target: 100, current: () => Object.keys(getCheckins()).length },
      { id: 'streak_7', name: 'Uma Semana de Foco', desc: 'Complete 7 treinos seguidos sem falhar (dias de descanso não contam).', icon: '📅', target: 7, current: () => getGamification().longestStreak || 0 },
      { id: 'streak_14', name: 'Chama Acesa', desc: 'Complete 14 treinos seguidos sem falhar (dias de descanso não contam).', icon: '🔥', target: 14, current: () => getGamification().longestStreak || 0 },
      { id: 'streak_30', name: 'Inabalável', desc: 'Complete 30 treinos seguidos sem falhar (dias de descanso não contam).', icon: '🏆', target: 30, current: () => getGamification().longestStreak || 0 },
      { id: 'streak_100', name: 'One For All: 100%', desc: 'Complete 100 treinos seguidos sem falhar (dias de descanso não contam).', icon: '💯', target: 100, current: () => getGamification().longestStreak || 0 },
      { id: 'xp_8000', name: 'É de mais de 8000!', desc: 'Acumule um total de 8.000 XP na sua jornada de treinos.', icon: '📈', target: 8000, current: () => getGamification().totalXP || 0 },
      { id: 'level_10', name: 'Posso Fazer Isso O Dia Todo', desc: 'Alcance o nível 10.', icon: '🛡️', target: 10, current: () => getLevelInfo(getGamification().totalXP).level },
      { id: 'level_25', name: 'Vá Além... Plus Ultra!', desc: 'Alcance o nível 25.', icon: '💥', target: 25, current: () => getLevelInfo(getGamification().totalXP).level },
      { id: 'level_50', name: 'Bankai!', desc: 'Alcance o nível 50.', icon: '⚔️', target: 50, current: () => getLevelInfo(getGamification().totalXP).level },
      { id: 'level_90', name: 'Kurohitsugi', desc: 'Alcance o nível 90.', icon: '⚫', target: 90, current: () => getLevelInfo(getGamification().totalXP).level },
      { id: 'level_100', name: 'Uma Repetição Para Todos Governar', desc: 'Alcance o nível máximo: 100.', icon: '💍', target: 100, current: () => getLevelInfo(getGamification().totalXP).level },
      { id: 'water_hidratado', name: 'Hidratado(a)', desc: 'Bata a meta de água pela primeira vez.', icon: '💧', target: 1, current: () => Object.keys(getGamification().waterBonus || {}).length },
      { id: 'water_30', name: 'Hábito Líquido', desc: 'Bata a meta de água em 30 dias (não precisam ser seguidos).', icon: '🌊', target: 30, current: () => Object.keys(getGamification().waterBonus || {}).length },
      { id: 'perfis_2', name: 'Com Grandes Poderes, Vem Grandes Responsabilidades', desc: 'Crie, nomeie e equipe (ative) o seu segundo Perfil de Treino.', icon: '🕷️', target: 2, current: () => Object.keys(getGamification().equippedProfiles || {}).length },
      { id: 'peso_5x', name: 'Compromisso de Peso', desc: 'Registre seu peso 5 vezes no histórico.', icon: '⚖️', target: 5, current: () => (getProfile().weightHistory || []).length },
      { id: 'refeicao_livre', name: 'Refeição Conquistada', desc: 'Desbloqueie sua primeira Refeição Livre.', icon: '🍕', target: 1, current: () => Object.keys(getGamification().freeMealRewards || {}).length },
      { id: 'aniversario', name: 'Mais um Ano de Treino', desc: 'Complete um aniversário seu usando o app.', icon: '🎂', target: 1, current: () => Object.keys(getGamification().birthdayGreeted || {}).length },
      { id: 'star_wars_day', name: 'Que a Força Esteja Com Você', desc: 'Faça check-in no dia 4 de maio.', icon: '⭐', target: 1, current: () => Object.keys(getCheckins()).some(d => d.slice(5) === '05-04') ? 1 : 0 },
      { id: 'night_checkin', name: 'Eu Sou a Vingança, Eu Sou a Noite', desc: 'Faça check-in de um treino entre 21h e 7h da manhã.', icon: '🦇', target: 1, current: () => Object.keys(getGamification().nightCheckins || {}).length > 0 ? 1 : 0 },
      { id: 'rock_lee_weights', name: 'Os Pesos de Rock Lee', desc: 'Aumente a carga de um exercício em 10kg ou mais de uma só vez, usando o botão de ajuste.', icon: '🏋️', target: 1, current: () => getGamification().bigWeightJump ? 1 : 0 },
      { id: 'volume_10k', name: 'Kaioken', desc: 'Acumule 10.000 kg de volume total levantado.', icon: '🔴', target: 10000, current: () => getTotalVolume() },
      { id: 'volume_30k', name: 'Kaioken x3', desc: 'Acumule 30.000 kg de volume total levantado.', icon: '🟠', target: 30000, current: () => getTotalVolume() },
      { id: 'volume_100k', name: 'Kaioken x10', desc: 'Acumule 100.000 kg de volume total levantado.', icon: '🔥', target: 100000, current: () => getTotalVolume() },
      { id: 'volume_1m', name: 'Super Saiyajin', desc: 'Acumule 1.000.000 kg de volume total levantado.', icon: '💛', target: 1000000, current: () => getTotalVolume() }
    ];
  }
};
