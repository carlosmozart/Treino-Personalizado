window.TREINO_BACKUP_CRYPTO = {
  bytesToBase64(bytes) { let text = ''; bytes.forEach(byte => { text += String.fromCharCode(byte); }); return btoa(text); },
  base64ToBytes(text) { const binary = atob(text); return Uint8Array.from(binary, char => char.charCodeAt(0)); },
  async keyFromPassword(password, salt, iterations) {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  },
  async encrypt(backup, password, iterations, appVersion) {
    if (!window.crypto || !crypto.subtle) throw new Error('Criptografia indisponível');
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.keyFromPassword(password, salt, iterations);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(backup)));
    return { app: 'treino-personalizado', backupVersion: 2, encrypted: true, appVersion, exportedAt: backup.exportedAt, algorithm: 'AES-GCM', kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations }, salt: this.bytesToBase64(salt), iv: this.bytesToBase64(iv), ciphertext: this.bytesToBase64(new Uint8Array(ciphertext)) };
  },
  async decrypt(wrapper, password) {
    if (!window.crypto || !crypto.subtle || wrapper.algorithm !== 'AES-GCM' || !wrapper.kdf || wrapper.kdf.name !== 'PBKDF2' || wrapper.kdf.hash !== 'SHA-256' || !Number.isInteger(wrapper.kdf.iterations) || wrapper.kdf.iterations < 100000) throw new Error('Formato de criptografia inválido');
    const salt = this.base64ToBytes(wrapper.salt), iv = this.base64ToBytes(wrapper.iv);
    const key = await this.keyFromPassword(password, salt, wrapper.kdf.iterations);
    return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, this.base64ToBytes(wrapper.ciphertext))));
  }
};
