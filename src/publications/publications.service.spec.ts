import { NotFoundException } from '@nestjs/common';
import { Publication } from './publication.entity';
import { PublicationsService } from './publications.service';

describe('PublicationsService', () => {
  const repo = { findOneBy: jest.fn(), save: jest.fn((p) => Promise.resolve(p)) };
  const service = new PublicationsService(repo as any);

  beforeEach(() => jest.clearAllMocks());

  it('throws when the publication does not exist', async () => {
    repo.findOneBy.mockResolvedValueOnce(null);
    await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
  });

  it('updates only the fields that were sent', async () => {
    repo.findOneBy.mockResolvedValueOnce({
      uid: 'bible-on-air',
      summary: '北門雲端靈修',
      about: null,
    } as Publication);

    const result = await service.update('bible-on-air', { about: '<p>關於</p>' });

    expect(result).toMatchObject({ summary: '北門雲端靈修', about: '<p>關於</p>' });
  });

  it('stores an empty summary as null', async () => {
    repo.findOneBy.mockResolvedValueOnce({ uid: 'bible-on-air', summary: 'x' } as Publication);
    const result = await service.update('bible-on-air', { summary: '  ' });
    expect(result.summary).toBeNull();
  });
});
