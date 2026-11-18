// X15: favoritos, exercícios próprios e outros nomes juntam item a item entre dois aparelhos
// (antes, a lista inteira vinha do aparelho que mexeu nos ajustes por último).
import { describe, expect, it } from 'vitest';
import { addCustomExercise, removeCustomExercise, toggleFavorite, updateSettings } from './actions';
import { mergeExercises, setAliases, undoMerge } from './exercise-merge';
import { mergeAppData } from './sync';
import { sampleData } from './testing';
import type { AppData } from './model';

const T = (min: number) => new Date(2026, 10, 17, 10, min);
const GROUPS = ['Peito', 'Costas'];
const none = () => false;
const fav = (d: AppData, name: string, min: number) => toggleFavorite(d, name, T(min)).data;

describe('X15: biblioteca pessoal na junção de dois aparelhos', () => {
  it('cada aparelho marca um favorito diferente: os dois ficam, nos dois sentidos', () => {
    const base = sampleData();
    const phone = fav(base, 'Supino Reto', 1);
    const tablet = fav(base, 'Remada Curvada', 2);
    expect(mergeAppData(phone, tablet).settings.favorites?.sort()).toEqual(['remada curvada', 'supino reto']);
    expect(mergeAppData(tablet, phone).settings.favorites?.sort()).toEqual(['remada curvada', 'supino reto']);
  });

  it('desmarcar num aparelho tira dos dois, e a junção não traz de volta', () => {
    const both = mergeAppData(fav(sampleData(), 'Supino Reto', 1), fav(sampleData(), 'Remada Curvada', 2));
    const phone = fav(both, 'Supino Reto', 5);
    expect(phone.settings.favorites).toEqual(['remada curvada']);
    const merged = mergeAppData(both, phone);
    expect(merged.settings.favorites).toEqual(['remada curvada']);
    expect(mergeAppData(merged, both).settings.favorites).toEqual(['remada curvada']);
  });

  it('exercícios próprios e outros nomes de aparelhos diferentes ficam todos', () => {
    const base = sampleData();
    const phone = setAliases(addCustomExercise(base, { name: 'Remada no TRX', group: 'Costas' }, T(1), GROUPS, none).data, 'Supino Reto', ['bench press'], T(2)).data;
    const tablet = setAliases(addCustomExercise(base, { name: 'Crucifixo na polia baixa', group: 'Peito' }, T(3), GROUPS, none).data, 'Remada Curvada', ['bent over row'], T(4)).data;
    const merged = mergeAppData(phone, tablet);
    expect(merged.settings.customExercises?.map(c => c.name).sort()).toEqual(['Crucifixo na polia baixa', 'Remada no TRX']);
    expect(merged.settings.aliases).toEqual({ 'supino reto': ['bench press'], 'remada curvada': ['bent over row'] });
    // apagar o exercício próprio num aparelho apaga dos dois
    const removed = removeCustomExercise(merged, 'Remada no TRX', T(9)).data;
    expect(mergeAppData(merged, removed).settings.customExercises?.map(c => c.name)).toEqual(['Crucifixo na polia baixa']);
  });

  it('o mesmo apelido mudado nos dois aparelhos: vale o mais recente', () => {
    const base = sampleData();
    const phone = setAliases(base, 'Supino Reto', ['bench'], T(1)).data;
    const tablet = setAliases(base, 'Supino Reto', ['bench press'], T(2)).data;
    expect(mergeAppData(phone, tablet).settings.aliases).toEqual({ 'supino reto': ['bench press'] });
  });

  it('o resto dos ajustes continua vindo inteiro do lado mais recente, sem levar a biblioteca junto', () => {
    const base = sampleData();
    const phone = fav(base, 'Supino Reto', 1);
    const tablet = updateSettings(base, { restSeconds: 120 }, T(5)).data;
    const merged = mergeAppData(phone, tablet);
    expect(merged.settings.restSeconds).toBe(120);
    expect(merged.settings.favorites).toEqual(['supino reto']);
  });

  it('dados de antes desta versão (sem carimbo por item): junta os dois lados, sem perder nada', () => {
    const base = sampleData();
    const old = (s: Partial<AppData['settings']>, at: string): AppData => ({ ...base, settings: { ...base.settings, ...s }, sync: { changed: { settings: at }, deleted: {} } });
    const phone = old({ favorites: ['supino reto'] }, '2026-11-01T10:00:00.000Z');
    const tablet = old({ favorites: ['remada curvada'] }, '2026-11-02T10:00:00.000Z');
    expect(mergeAppData(phone, tablet).settings.favorites?.sort()).toEqual(['remada curvada', 'supino reto']);
  });

  it('juntar dois nomes e desfazer carimba favoritos e apelidos', () => {
    let d = fav(sampleData(), 'Supino da academia', 1);
    d = { ...d, workouts: [{ id: 'w', date: '2026-11-10', source: 'app', entries: [{ key: 'supino da academia', name: 'Supino da academia', mode: 'reps', sets: [{ reps: 10, weight: 50, kind: 'work' }] }] }] };
    const { result, undo } = mergeExercises(d, 'Supino da academia', 'Supino Reto', T(3));
    expect(result.data.settings.favorites).toEqual(['supino reto']);
    expect(result.data.sync.deleted['favorite:supino da academia']).toBeDefined();
    expect(result.data.sync.changed['alias:supino reto']).toBeDefined();
    const back = undoMerge(result.data, undo, T(4)).data;
    expect(back.settings.favorites).toEqual(['supino da academia']);
    expect(back.sync.changed['favorite:supino da academia']).toBeDefined();
  });
});
