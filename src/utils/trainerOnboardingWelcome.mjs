export const trainerWelcomeProfile = (config, teamKey, busUse, membership) => {
  const group = config.teamAppGroups.find(group => group.teams.includes(teamKey));
  return {
    apps: [...(group ? [group.app] : []), ...(busUse === 'yes' ? ['timetree'] : [])],
    dfbnet: group?.app !== 'spond',
    membershipStep: membership === 'no' ? 'membershipNew' : membership === 'yes' ? 'membershipExisting' : 'membership',
  };
};
