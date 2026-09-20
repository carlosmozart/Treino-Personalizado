window.TREINO_PROFILES = {
  active(profiles, activeProfileId) { return profiles[activeProfileId] || null; },
  has(profiles, profileId) { return !!profiles[profileId]; },
  isRestDay(profile, date, dayKeys) {
    if (!profile) return false;
    const workout = profile.schedule && profile.schedule[dayKeys[date.getDay()]];
    return !!(workout && (workout.optional || !(workout.exercises || []).length));
  }
};
