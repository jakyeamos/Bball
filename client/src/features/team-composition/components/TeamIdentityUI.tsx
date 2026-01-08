
import React, { useState, useEffect, useMemo } from 'react';
import { Player } from '@nba-draft-sim/shared';
import { evaluateTeamComposition, TeamArchetype } from '../evaluator';
import { Card } from '../../../components/Card';
import { motion, AnimatePresence } from 'framer-motion';

interface TeamIdentityUIProps {
  roster: Player[];
}

const SMOOTHING_THRESHOLD = 1.05; // 5% increase required to change order

export const TeamIdentityUI: React.FC<TeamIdentityUIProps> = ({ roster }) => {
  const [smoothedArchetypes, setSmoothedArchetypes] = useState<TeamArchetype[]>([]);

  const newComposition = useMemo(() => {
    if (roster.length < 4) return null;
    return evaluateTeamComposition(roster);
  }, [roster]);

  useEffect(() => {
    if (!newComposition) {
      setSmoothedArchetypes([]);
      return;
    }

    const newTop3 = newComposition.archetypes.slice(0, 3);

    if (smoothedArchetypes.length === 0) {
      setSmoothedArchetypes(newTop3);
      return;
    }

    const oldLeader = smoothedArchetypes[0];
    const newLeader = newTop3[0];

    if (oldLeader && newLeader && oldLeader.name !== newLeader.name) {
      if (newLeader.score > oldLeader.score * SMOOTHING_THRESHOLD) {
        setSmoothedArchetypes(newTop3);
      } else {
        const updatedOldOrder = smoothedArchetypes.map(oldArch => {
          const newData = newComposition.archetypes.find(a => a.name === oldArch.name);
          return newData ? { ...oldArch, score: newData.score } : oldArch;
        });
        setSmoothedArchetypes(updatedOldOrder);
      }
    } else {
      setSmoothedArchetypes(newTop3);
    }

  }, [newComposition, smoothedArchetypes]);

  if (roster.length < 4 || smoothedArchetypes.length === 0) {
    return null;
  }

  return (
    <Card padding="md" className="bg-white shadow-sm border border-gray-200">
      <h3 className="font-bold text-md text-gray-800 mb-4">Team Identity</h3>
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
              className="flex items-center"
            >
              <div className="text-xl font-bold text-gray-300 mr-4">{index + 1}</div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{archetype.name}</div>
                <p className="text-sm text-gray-600 leading-tight">{archetype.description}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  );
};
