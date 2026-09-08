import { abilityDefinition, isAbilityId, type AbilityId } from './abilities';
import type { ResidentId } from './residents';

export type KnowledgeSource = { kind: 'book' | 'observation' | 'preview' | 'legacy'; id: string };
export type AbilityKnowledge = { status: 'familiar' | 'practiced'; source: KnowledgeSource };
export type SpiritKnowledge = Record<ResidentId, Partial<Record<AbilityId, AbilityKnowledge>>>;

export function createKnowledge(): SpiritKnowledge {
  return { pip: {}, moss: {}, fern: {} };
}

function isGenuineSource(source: KnowledgeSource): boolean {
  return source.kind === 'book' || source.kind === 'observation';
}

export function learnAbility(
  knowledge: SpiritKnowledge,
  who: ResidentId,
  ability: AbilityId,
  source: KnowledgeSource,
): SpiritKnowledge {
  if (!isAbilityId(ability) || !knowledge[who]) return knowledge;
  const existing = knowledge[who][ability];
  if (existing) {
    if (isGenuineSource(existing.source) || !isGenuineSource(source)) return knowledge;
    return {
      ...knowledge,
      [who]: { ...knowledge[who], [ability]: { ...existing, source } },
    };
  }

  return {
    ...knowledge,
    [who]: { ...knowledge[who], [ability]: { status: 'familiar', source } },
  };
}

export function canPerform(knowledge: SpiritKnowledge, who: ResidentId, ability: AbilityId): boolean {
  if (!isAbilityId(ability) || !knowledge[who]?.[ability]) return false;
  const definition = abilityDefinition(ability);
  return Boolean(definition?.enabled && definition.prerequisites.every(required => knowledge[who][required]));
}

export function practiceAbility(knowledge: SpiritKnowledge, who: ResidentId, ability: AbilityId): SpiritKnowledge {
  if (!isAbilityId(ability) || !knowledge[who]) return knowledge;
  if (!canPerform(knowledge, who, ability) || knowledge[who][ability]?.status === 'practiced') return knowledge;
  return {
    ...knowledge,
    [who]: {
      ...knowledge[who],
      [ability]: { ...knowledge[who][ability]!, status: 'practiced' },
    },
  };
}
