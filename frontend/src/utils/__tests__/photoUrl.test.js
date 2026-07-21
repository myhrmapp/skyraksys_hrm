import { buildPhotoUrl } from '../photoUrl';

describe('buildPhotoUrl', () => {
  it('returns the upload path unchanged when it is already a relative path', () => {
    expect(buildPhotoUrl('/uploads/employee-photos/test.jpg')).toBe('/uploads/employee-photos/test.jpg');
  });

  it('returns the original absolute URL unchanged', () => {
    const absoluteUrl = 'https://backend.example.com/uploads/employee-photos/test.jpg';
    expect(buildPhotoUrl(absoluteUrl)).toBe(absoluteUrl);
  });
});
