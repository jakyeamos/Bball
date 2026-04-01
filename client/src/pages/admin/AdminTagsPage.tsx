import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { featureFlags } from '@nba-draft-sim/shared';
import { apiService } from '../../services/api';
import { TagManager } from '../../components/admin/TagManager';

export function AdminTagsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['admin-tags'],
    queryFn: apiService.getAdminTags,
    enabled: featureFlags.cmsTagManagementEnabled,
  });

  if (!featureFlags.cmsTagManagementEnabled) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-cv-chalk/70">Tag management is disabled.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-4xl font-semibold text-cv-chalk mb-6">Admin Tags</h1>
      <TagManager
        tags={data?.tags ?? []}
        onCreate={async (name) => {
          await apiService.saveTag(name);
          queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
        }}
        onDelete={async (name) => {
          await apiService.deleteTag(name);
          queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
        }}
      />
    </div>
  );
}
