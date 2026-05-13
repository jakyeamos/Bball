
import React, { useState, useEffect, useMemo } from 'react';
import { Player } from '@nba-draft-sim/shared';
import { evaluateTeamComposition, TeamArchetype } from '../evaluator';
import { Card } from '../../../components/Card';
import { motion, AnimatePresence } from 'framer-motion';

interface TeamIdentityUIProps {
  roster: Player[];
}

const SMOOTHING_THRESHOLD = 1.05; // 5% increase required to change order

function sameArchetypeOrder(a: TeamArchetype[], b: TeamArchetype[]): boolean {
  return a.length === b.length && a.every((archetype, index) => (
    archetype.name === b[index]?.name && archetype.score === b[index]?.score
  ));
}

export const TeamIdentityUI: React.FC<TeamIdentityUIProps> = ({ roster }) => {
  const [smoothedArchetypes, setSmoothedArchetypes] = useState<TeamArchetype[]>([]);

  const newComposition = useMemo(() => {
    if (roster.length < 4) return null;
    return evaluateTeamComposition(roster);
  }, [roster]);

  useEffect(() => {
    if (!newComposition) {
      setSmoothedArchetypes((current) => current.length === 0 ? current : []);
      return;
    }

    const newTop3 = newComposition.archetypes.slice(0, 3);

    setSmoothedArchetypes((current) => {
      if (current.length === 0) {
        return newTop3;
      }

      const oldLeader = current[0];
      const newLeader = newTop3[0];

      if (oldLeader && newLeader && oldLeader.name !== newLeader.name) {
        if (newLeader.score > oldLeader.score * SMOOTHING_THRESHOLD) {
          return newTop3;
        }

        const updatedOldOrder = current.map(oldArch => {
          const newData = newComposition.archetypes.find(a => a.name === oldArch.name);
          return newData ? { ...oldArch, score: newData.score } : oldArch;
        });
        return sameArchetypeOrder(current, updatedOldOrder) ? current : updatedOldOrder;
      }

      return sameArchetypeOrder(current, newTop3) ? current : newTop3;
    });
  }, [newComposition]);

  if (roster.length < 4 || smoothedArchetypes.length === 0) {
    return null;
  }

  return (
    <Card padding="md" className="cv-surface">
      <h3 className="mb-4 text-md font-bold text-cv-chalk">Team Identity</h3>
      <div className="space-y-4">
        <AnimatePresence>
          {smoothedArchetypes.map((archetype, index) => (
            <motion.div
              key={archetype.name}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center rounded-lg px-2 py-1.5"
            >
              <div className="mr-4 text-xl font-bold text-cv-accent/70">{index + 1}</div>
              <div className="flex-1">
                <div className="font-semibold text-cv-chalk">{archetype.name}</div>
                <p className="text-sm leading-tight text-cv-chalk/70">{archetype.description}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  );
};
