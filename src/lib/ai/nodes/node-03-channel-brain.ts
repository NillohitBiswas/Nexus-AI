import { prisma } from "@/lib/db";

export async function runChannelBrain(videoId: string) {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { channelId: true }
  });

  if (!video) return { newCommenters: 0, superFanCount: 0 };

  const comments = await prisma.commentIntelligence.findMany({
    where: { videoId }
  });

  let newCommenters = 0;
  let superFanCount = 0;

  for (const c of comments) {
    if (!c.authorChannelId) continue;

    let commenter = await prisma.channelCommenter.findFirst({
      where: {
        channelId: video.channelId,
        authorChannelId: c.authorChannelId
      }
    });

    if (!commenter) {
      commenter = await prisma.channelCommenter.create({
        data: {
          channelId: video.channelId,
          authorChannelId: c.authorChannelId,
          sentimentHistory: c.sentiment ? [c.sentiment] : [],
          isSuperFan: false
        }
      });
      newCommenters++;
    } else {
      const history = [...commenter.sentimentHistory, c.sentiment || 0];
      if (history.length > 10) history.shift(); // Keep last 10 sentiments

      const isSuperFan = history.length >= 3;
      if (isSuperFan) {
        superFanCount++;
      }

      await prisma.channelCommenter.update({
        where: { id: commenter.id },
        data: {
          sentimentHistory: history,
          isSuperFan: isSuperFan
        }
      });
    }
  }

  return {
    newCommenters,
    superFanCount
  };
}
