#!/usr/bin/env bash
set -euo pipefail
ROOT=/home/ubuntu/gemini-ops-fleet-dashboard
OUT=$ROOT/docs/gemini-ops-fleet-devpost-demo-en.mp4
TMP=$ROOT/docs/video_segments_en
OV=/home/ubuntu/screenshots/webdev-preview-root-1787092394041970047-8808.png
REG=/home/ubuntu/screenshots/webdev-preview-root-1787092393679500954-2254.png
EV=/home/ubuntu/screenshots/webdev-preview-root-1787092393799425135-4730.png
AUD=/home/ubuntu/screenshots/webdev-preview-root-1787092394041535203-6709.png
ADMIN=/home/ubuntu/screenshots/webdev-preview-root-1787092395064783742-3334.png
ARCH=/home/ubuntu/webdev-static-assets/gemini-ops-fleet-architecture-rendered.png
FONT=/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc
mkdir -p "$TMP"
rm -f "$TMP"/*.mp4 "$TMP/concat.txt" "$OUT"
make_segment() {
  local n="$1" duration="$2" image="$3" title="$4"
  ffmpeg -y -loglevel error -loop 1 -i "$image" -t "$duration" \
    -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,drawbox=x=0:y=0:w=1280:h=82:color=0x102b2b@0.88:t=fill,drawtext=fontfile=$FONT:text='$title':fontcolor=white:fontsize=27:x=42:y=26,fade=t=in:st=0:d=0.35,fade=t=out:st=$(awk "BEGIN {print $duration-0.35}"):d=0.35" \
    -an -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "$TMP/segment-$n.mp4"
  printf "file '%s'\n" "$TMP/segment-$n.mp4" >> "$TMP/concat.txt"
}
make_segment 01 25 "$OV" "GEMINI OPS FLEET  /  CLINICAL COMMAND LEDGER"
make_segment 02 30 "$REG" "AGENT REGISTRY  /  CAPABILITIES AND RESTRICTIONS"
make_segment 03 30 "$EV" "EVENT STREAM  /  ASYNC ROUTING AND STATE"
make_segment 04 30 "$AUD" "AUDIT AND TRACE  /  REFUSALS ARE EVIDENCE"
make_segment 05 30 "$OV" "EVIDENCE-LED APPROVAL  /  GEMINI SUMMARY"
make_segment 06 35 "$ADMIN" "HUMAN GOVERNANCE  /  DRY-RUN AND SSE INBOX"
make_segment 07 30 "$ADMIN" "STREAM HEALTH  /  PROMETHEUS AND TRENDS"
make_segment 08 20.8 "$ARCH" "SYSTEM ARCHITECTURE  /  FORTIFIED ENTERPRISE FLEET"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/concat.txt" -c copy "$TMP/visuals.mp4"
ffmpeg -y -loglevel error -i "$TMP/visuals.mp4" -i "$ROOT/docs/gemini-ops-fleet-voiceover-en.wav" \
  -vf "subtitles=$ROOT/docs/devpost-video-en.srt:force_style='FontName=DejaVu Sans,FontSize=12,Outline=1,Shadow=0,Alignment=2,MarginV=18'" \
  -af "apad=pad_dur=12" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -t 230.8 "$OUT"
ffprobe -v error -show_entries stream=index,codec_name,width,height,r_frame_rate,sample_rate -show_entries format=duration,size -of default=nw=1 "$OUT"
