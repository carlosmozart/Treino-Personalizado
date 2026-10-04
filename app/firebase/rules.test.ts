// Testes das regras do Firestore no emulador local (sem conta nem projeto real).
// Rodar com: npm run test:rules
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, test } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-treino',
    firestore: { rules: readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 }
  });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const ana = () => env.authenticatedContext('ana').firestore();
const bia = () => env.authenticatedContext('bia').firestore();
const anon = () => env.unauthenticatedContext().firestore();

test('cada pessoa lê e grava só os próprios dados', async () => {
  await assertSucceeds(setDoc(doc(ana(), 'users/ana'), { revision: 1, main: {} }));
  await assertSucceeds(getDoc(doc(ana(), 'users/ana')));
  await assertFails(getDoc(doc(bia(), 'users/ana')));
  await assertFails(setDoc(doc(bia(), 'users/ana'), { revision: 1, main: {} }));
  await assertFails(getDoc(doc(anon(), 'users/ana')));
  await assertFails(setDoc(doc(anon(), 'users/anon'), { revision: 1 }));
});

test('revisão começa em 1 e só avança de 1 em 1', async () => {
  await assertFails(setDoc(doc(ana(), 'users/ana'), { revision: 5 }));
  await assertSucceeds(setDoc(doc(ana(), 'users/ana'), { revision: 1 }));
  await assertSucceeds(updateDoc(doc(ana(), 'users/ana'), { revision: 2 }));
  await assertFails(updateDoc(doc(ana(), 'users/ana'), { revision: 2 }));
  await assertFails(updateDoc(doc(ana(), 'users/ana'), { revision: 4 }));
});

test('partes do histórico: só da própria pessoa e só com nome de ano ou mês', async () => {
  await assertSucceeds(setDoc(doc(ana(), 'users/ana/chunks/2026'), { workouts: [] }));
  await assertSucceeds(setDoc(doc(ana(), 'users/ana/chunks/2026-03'), { workouts: [] }));
  await assertFails(setDoc(doc(ana(), 'users/ana/chunks/qualquer'), { workouts: [] }));
  await assertFails(getDoc(doc(bia(), 'users/ana/chunks/2026')));
  await assertFails(setDoc(doc(bia(), 'users/ana/chunks/2026'), { workouts: [] }));
});

test('excluir a conta apaga os próprios dados; ninguém mais pode', async () => {
  await setDoc(doc(ana(), 'users/ana'), { revision: 1 });
  await assertFails(deleteDoc(doc(bia(), 'users/ana')));
  await assertSucceeds(deleteDoc(doc(ana(), 'users/ana')));
});

test('qualquer outra coleção é negada', async () => {
  await assertFails(setDoc(doc(ana(), 'outros/x'), { a: 1 }));
  await assertFails(getDoc(doc(ana(), 'outros/x')));
});
