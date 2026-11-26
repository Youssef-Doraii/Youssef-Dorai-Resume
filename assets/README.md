# Files the site needs

Put these in this folder with exactly these names. Until a file is here, the page shows a
sand-coloured stand-in, so nothing looks broken. When you preview on localhost, each stand-in
shows the file name it is waiting for.

## Photos and screenshots (required)

| File | What | Size |
| --- | --- | --- |
| `youssef.jpg` | Photo of you for the hero. Upright (portrait), face in the top half. | 1200 x 1500 (4:5) |
| `ifriqiya.jpg` | Ifriqiya screenshot, desktop browser, top of the page. | 1600 x 1000 (16:10) |
| `immox.jpg` | IMMOX screenshot, desktop browser, top of the page. | 1600 x 1000 (16:10) |
| `egypt-1.jpg`, `egypt-2.jpg`, `egypt-3.jpg` | One frame from each of three Egypt reels. | 720 x 1280 (9:16) |
| `graduation.jpg` | One frame from the graduation video. | 720 x 1280 (9:16) |

Keep each JPG under about 300 KB (export at 80% quality, or run it through squoosh.app).

## Videos (optional)

Clicking a reel plays the matching MP4 in the page. If there's no MP4, the click opens the post
on Instagram or TikTok instead (once you've set those links, below).

| File | What |
| --- | --- |
| `egypt-1.mp4`, `egypt-2.mp4`, `egypt-3.mp4` | The three Egypt reels |
| `graduation.mp4` | The graduation video |

Export them at 720p, H.264, about 2 to 4 MB each. GitHub refuses files over 100 MB.

## Share image

`share.jpg` (1200 x 630) is what LinkedIn, WhatsApp and others show when someone shares your
link. A version with the stand-in photo is already here. Replace it with a new screenshot once
your photo is in.

## Links to fill in (in index.html)

Search index.html for `YOUR_` and replace each one:

- `https://YOUR_IMMOX_URL`: the live IMMOX site
- `https://YOUR_EGYPT_REELS_URL`: the Egypt reels or blog
- `https://YOUR_GRADUATION_TIKTOK_URL`: the graduation TikTok
- `https://www.instagram.com/YOUR_INSTAGRAM_HANDLE`: your Instagram
- `https://www.tiktok.com/@YOUR_TIKTOK_HANDLE`: your TikTok

On the live site, any link still holding `YOUR_` is hidden, so nobody lands on a dead link.
On localhost it shows with a dashed outline so you can spot it.
