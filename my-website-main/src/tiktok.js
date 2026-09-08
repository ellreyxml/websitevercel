export async function scrapeTikWM(tiktokUrl) {
  const response = await fetch(
    "https://www.tikwm.com/api/?url=" +
      encodeURIComponent(tiktokUrl),
    {
      method: "POST",
      headers: {
        Accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    throw new Error(`TikWM HTTP ${response.status}`);
  }

  const result = await response.json();

  if (result.code !== 0) {
    throw new Error(
      result.msg || "TikWM request gagal"
    );
  }

  const data = result.data || {};

  const author = data.author || {};
  const musicInfo = data.music_info || null;

  return {
    id: data.id || null,

    region: data.region || null,

    title:
      data.title ||
      data.desc ||
      data.content_desc?.[0] ||
      null,

    cover:
      data.cover ||
      data.ai_dynamic_cover ||
      data.origin_cover ||
      null,

    aiDynamicCover:
      data.ai_dynamic_cover ||
      data.cover ||
      data.origin_cover ||
      null,

    originCover:
      data.origin_cover ||
      data.cover ||
      data.ai_dynamic_cover ||
      null,

    play:
      data.hdplay ||
      data.play ||
      data.play_url ||
      data.video ||
      null,

    wmplay:
      data.wmplay ||
      data.wm_play ||
      data.play ||
      null,

    hdplay:
      data.hdplay ||
      data.play ||
      data.play_url ||
      null,

    music:
      data.music ||
      musicInfo?.play ||
      musicInfo?.url ||
      null,

    musicInfo,

    images:
      data.images ||
      data.image_urls ||
      data.photos ||
      [],

    author,

    authorId:
      author.id || null,

    username:
      author.unique_id ||
      author.uniqueId ||
      author.username ||
      null,

    nickname:
      author.nickname ||
      author.name ||
      null,

    avatar:
      author.avatar ||
      author.avatar_url ||
      null,

    duration:
      data.duration ?? 0,

    size:
      data.size ?? 0,

    wmSize:
      data.wm_size ??
      data.wmSize ??
      0,

    playCount:
      data.play_count ??
      data.playCount ??
      0,

    diggCount:
      data.digg_count ??
      data.like_count ??
      data.diggCount ??
      0,

    commentCount:
      data.comment_count ??
      data.commentCount ??
      0,

    shareCount:
      data.share_count ??
      data.shareCount ??
      0,

    downloadCount:
      data.download_count ??
      data.downloadCount ??
      0,

    collectCount:
      data.collect_count ??
      data.collectCount ??
      0,

    createTime:
      data.create_time ??
      data.createTime ??
      null,

    raw: result
  };
}