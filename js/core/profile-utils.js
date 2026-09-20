window.TREINO_PROFILES = {
  active(profiles, activeProfileId) { return profiles[activeProfileId] || null; },
  has(profiles, profileId) { return !!profiles[profileId]; }
};
