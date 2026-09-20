window.TREINO_DISPLAY = {
  weekdayOf(dateStr) {
    const names = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    return names[new Date(dateStr + 'T12:00:00').getDay()] || '';
  },
  capitalize(text) { return text ? text.charAt(0).toUpperCase() + text.slice(1) : ''; }
};
