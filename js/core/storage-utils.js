window.TREINO_STORAGE = {
  loadJSON(key, available) { if (!available) return {}; try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (_) { return {}; } },
  loadString(key, available) { if (!available) return null; try { return localStorage.getItem(key); } catch (_) { return null; } },
  saveString(key, value, available) { if (!available) return false; try { localStorage.setItem(key, value); return true; } catch (_) { return false; } }
};
