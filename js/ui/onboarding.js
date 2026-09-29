window.TREINO_ONBOARDING = {
  create({
    document, window, getProfile, validateProfileNumbers, calculateAge, saveProfile, showToast,
    maybeShowSwipeHint
  }) {
    // ---------- ONBOARDING OBRIGATÓRIO (primeiro acesso) ----------
    function isProfileComplete() {
      return !!(getProfile().name && getProfile().name.trim() && getProfile().birthdate && getProfile().height && getProfile().weight);
    }

    function showOnboarding() {
      document.getElementById('onbName').value = getProfile().name || '';
      document.getElementById('onbBirthdate').value = getProfile().birthdate || '';
      document.getElementById('onbHeight').value = getProfile().height || '';
      document.getElementById('onbWeight').value = getProfile().weight || '';
      document.getElementById('onbSex').value = getProfile().sex || '';
      document.getElementById('onbActivity').value = getProfile().activityLevel || 'moderado';
      document.getElementById('onboardingOverlay').classList.remove('hidden');
    }

    window.submitOnboarding = function() {
      const name = document.getElementById('onbName').value.trim();
      const birthdate = document.getElementById('onbBirthdate').value;
      const height = document.getElementById('onbHeight').value;
      const weight = document.getElementById('onbWeight').value;
      const errEl = document.getElementById('onboardingError');

      const error = validateProfileNumbers({ height: 'onbHeight', weight: 'onbWeight' });
      if (error) {
        errEl.textContent = error.message;
        errEl.classList.remove('hidden');
        error.input.focus();
        return;
      }

      if (!name || !birthdate || !height || !weight) {
        errEl.textContent = '⚠️ Preencha nome, data de nascimento, altura e peso para continuar.';
        errEl.classList.remove('hidden');
        return;
      }
      const age = calculateAge(birthdate);
      if (age === null || age < 0 || age > 120) {
        errEl.textContent = '⚠️ Verifique a data de nascimento informada.';
        errEl.classList.remove('hidden');
        return;
      }
      errEl.classList.add('hidden');

      // reaproveita o formulário real do perfil + saveProfile() para não duplicar lógica
      document.getElementById('profileName').value = name;
      document.getElementById('profileBirthdate').value = birthdate;
      document.getElementById('profileHeight').value = height;
      document.getElementById('profileWeight').value = weight;
      document.getElementById('profileTargetWeight').value = getProfile().targetWeight || '';
      document.getElementById('profileSex').value = document.getElementById('onbSex').value;
      document.getElementById('profileActivity').value = document.getElementById('onbActivity').value;
      if (!saveProfile()) {
        errEl.textContent = document.getElementById('profileValidationError').textContent;
        errEl.classList.remove('hidden');
        return;
      }

      document.getElementById('onboardingOverlay').classList.add('hidden');
      showToast(`Bem-vindo(a), ${name}! Perfil configurado.`);
      maybeShowSwipeHint();
    };


    return { isProfileComplete, showOnboarding };
  }
};
