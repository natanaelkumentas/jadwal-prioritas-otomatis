import { Staff } from '@/lib/scheduler-engine/types';

/**
 * Returns staff members in the exact visual row sequence rendered by RosterGrid.
 * 1. Manager Teknik
 * 2. CNS technical subgroups (ordered by sub_group)
 * 3. ESS technical subgroups (ordered by sub_group)
 * 4. Any other personnel
 */
export function getRosterStaffOrder(allStaff: Staff[]): Staff[] {
  const managerStaff = allStaff.filter(s => s.role_level === 'Manager Teknik');
  const nonManagerCNS = allStaff.filter(s => s.group === 'CNS' && s.role_level !== 'Manager Teknik');
  const cnsSubGroups = Array.from(new Set(nonManagerCNS.map(s => s.sub_group))).sort();

  const cnsOrdered: Staff[] = [];
  cnsSubGroups.forEach(sub => {
    cnsOrdered.push(...nonManagerCNS.filter(s => s.sub_group === sub));
  });

  const essStaff = allStaff.filter(s => s.group === 'ESS');
  const essSubGroups = Array.from(new Set(essStaff.map(s => s.sub_group))).sort();

  const essOrdered: Staff[] = [];
  essSubGroups.forEach(sub => {
    essOrdered.push(...essStaff.filter(s => s.sub_group === sub));
  });

  const handledIds = new Set([...managerStaff, ...cnsOrdered, ...essOrdered].map(s => s.id));
  const remaining = allStaff.filter(s => !handledIds.has(s.id));

  return [...managerStaff, ...cnsOrdered, ...essOrdered, ...remaining];
}
