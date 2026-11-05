// Waiting places never count as available tournament places.
export function eventCategorySoldOut(category) {
  return Number.isSafeInteger(category?.capacity) && category.capacity > 0
    && Array.isArray(category.teams)
    && category.teams.filter(team => team.status === 'confirmed').length >= category.capacity;
}
