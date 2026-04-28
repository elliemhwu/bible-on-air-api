import { BibleController } from './bible.controller';
import { BibleService } from './bible.service';
import { BadRequestException } from '@nestjs/common';
import { VerseResultResponse } from './bible.types';

const MOCK_RESULT: VerseResultResponse = {
  ranges: [{ abbrZh: '出', zh: '出埃及記', en: 'Exodus', abbrEn: 'Exod', chapterStart: 13, verseStart: 19 }],
  verses: [{ abbrZh: '出', chapter: 13, verse: 19, text: '摩西把約瑟的骸骨', version: 'nstrunv' }],
};

describe('BibleController', () => {
  let controller: BibleController;
  let service: jest.Mocked<BibleService>;

  beforeEach(() => {
    service = { getVerses: jest.fn() } as any;
    controller = new BibleController(service);
  });

  describe('getVerses', () => {
    it('valid ref → delegates to BibleService and returns result', async () => {
      service.getVerses.mockResolvedValueOnce(MOCK_RESULT);

      const result = await controller.getVerses('出13:19');

      expect(service.getVerses).toHaveBeenCalledTimes(1);
      expect(result).toEqual(MOCK_RESULT);
    });

    it('missing ref → throws BadRequestException', async () => {
      await expect(controller.getVerses(undefined as any)).rejects.toThrow(BadRequestException);
      expect(service.getVerses).not.toHaveBeenCalled();
    });

    it('empty ref string → throws BadRequestException', async () => {
      await expect(controller.getVerses('')).rejects.toThrow(BadRequestException);
    });

    it('invalid ref → throws BadRequestException (not 500)', async () => {
      await expect(controller.getVerses('不存在的書卷999:999')).rejects.toThrow(BadRequestException);
    });

    it('passes parsed range to BibleService', async () => {
      service.getVerses.mockResolvedValueOnce(MOCK_RESULT);

      await controller.getVerses('出13:19');

      const [ranges] = service.getVerses.mock.calls[0];
      expect(ranges[0]).toMatchObject({ abbrZh: '出', chapterStart: 13, verseStart: 19 });
    });
  });
});
