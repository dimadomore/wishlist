#!/usr/bin/env bash
# Скачивает фото товаров в public/images/.
# Источники записаны в products.json (поле sourceImage) — при замене товара
# добавь сюда строку и перезапусти: bash scripts/fetch-images.sh
set -u

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
DIR="$(cd "$(dirname "$0")/.." && pwd)/public/images"
mkdir -p "$DIR"

fetch() { # fetch <filename> <url>
  local out="$DIR/$1" url="$2"
  local code
  code=$(curl -sL -A "$UA" -o "$out" -w "%{http_code}" "$url")
  local size
  size=$(wc -c <"$out" | tr -d ' ')
  if [ "$code" = "200" ] && [ "$size" -gt 2000 ]; then
    printf '  ok   %-32s %8s B\n' "$1" "$size"
  else
    printf '  FAIL %-32s http=%s size=%s\n' "$1" "$code" "$size"
    rm -f "$out"
  fi
}

fetch macbook-pro-14.jpg            "https://xstore.md/images/product/2026/03/apple-macbook-pro-14-2026-mgdn4-silver-xstore-md-10.jpg"
fetch xbloom-studio.webp            "https://cdn.shopify.com/s/files/1/0611/5704/8544/files/xbloom_Studio_Midnight_Black_04.webp?width=1200"
fetch timex-e-line.png              "https://cdn.shopify.com/s/files/1/0573/1198/5747/files/TW6A00700.png?v=1786650139&width=1200"
fetch aeropress.png                 "https://cdn.shopify.com/s/files/1/0601/8783/6659/files/AP_OG_PDP_ATF_1.png?v=1757095176&width=1200"
fetch hario-v60-server.jpg          "https://www.globalkitchenjapan.com/cdn/shop/files/HarioV60HeatResistantGlassCoffeeServerTransparent_1.jpg?v=1756276224&width=1200"
fetch rad-one-v2.png                "https://cdn.shopify.com/s/files/1/0579/5820/3571/files/0226-OV2WHG_01_02_WHITE_GUM_SIDE_02.png?v=1781012356&width=1200"
fetch thorne-multivitamin-elite.png "https://d1vo8zfysxy97v.cloudfront.net/media/product/vm114__vdadbc3e6f8ea5ada4b8684fc62234a4b9c574489.png"
fetch tent-2p.jpg                   "https://cdn.shopify.com/s/files/1/0490/8954/4346/files/naturehike_cloud_up_2_person_ultralight_backpacking_tent_main_white.jpg?v=1764660123&width=1200"
fetch carpisa-suitcase.jpg          "https://carpisa.md/images/product/2023/04/VAA505SS94202201_01_basechild.jpg"
fetch bellroy-apex.jpg              "https://cdn.shopify.com/s/files/1/0671/4592/4843/files/40342.jpg?v=1714110564&width=1200"
fetch bellroy-coin.jpg              "https://cdn.shopify.com/s/files/1/0671/4592/4843/files/23026.jpg?v=1716490081&width=1200"
fetch orbitkey-pouch.jpg            "https://cdn.shopify.com/s/files/1/0671/4592/4843/files/orbitkey-toiletry-pouch-10eim1.jpg?v=1780660784&width=1200"
fetch socks-adidas.avif             "https://sportlandia.md/image/cache/avif/catalog/products/57/JC6457/1-700x700.avif"
fetch socks-nike.jpg                "https://sportlandia.md/image/cache/catalog/products/00/IB6114-100/1-700x700.jpg"
fetch rework-outbound-30l.jpg       "https://cdn.shopify.com/s/files/1/0772/9142/1988/files/P1015654-Edit.jpg?v=1771894605&width=1200"

# Mad Heads отдают прозрачный PNG 1600px — кладём на белое и ужимаем.
fetch madheads-coffee.png           "https://api.madheadscoffee.com/cdn/s/1/p/205238/0/original.png"
if [ -f "$DIR/madheads-coffee.png" ]; then
  sips -Z 1000 -s format jpeg -s formatOptions 85 \
    "$DIR/madheads-coffee.png" --out "$DIR/madheads-coffee.jpg" >/dev/null 2>&1 &&
    rm -f "$DIR/madheads-coffee.png" &&
    printf '  ok   %-32s (сконвертирован в jpeg)\n' "madheads-coffee.jpg"
fi

echo "готово: $DIR"
