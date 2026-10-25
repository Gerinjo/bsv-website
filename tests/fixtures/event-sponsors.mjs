export const eventSponsors = Array.from({ length: 4 }, (_, index) => ({
  id: `youth-${index}`, name: `Jugendsponsor ${index}`,
  website: `https://example.org/youth-${index}`,
  logo: `https://bsvnordstern.de/images/sponsors/youth-${index}.png`,
  width: 112, height: 48, youth: true,
}));
