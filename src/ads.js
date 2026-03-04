const { initClient } = require("./client");

const AD_FIELDS = [
  "id",
  "name",
  "status",
  "adset_id",
  "creative",
  "created_time",
];

async function listAds(adSetId) {
  const { account, bizSdk } = initClient();

  let ads;
  if (adSetId) {
    const AdSet = bizSdk.AdSet;
    const adSet = new AdSet(adSetId);
    ads = await adSet.getAds(AD_FIELDS);
  } else {
    ads = await account.getAds(AD_FIELDS);
  }

  console.log(`\nEncontrados ${ads.length} anúncio(s):\n`);
  for (const ad of ads) {
    console.log(`  [${ad.id}] ${ad.name}`);
    console.log(`    AdSet: ${ad.adset_id} | Status: ${ad.status}`);
    console.log();
  }

  return ads;
}

async function createAdCreative({
  name,
  pageId,
  message,
  link,
  imageHash,
  imageUrl,
  callToAction = "LEARN_MORE",
}) {
  const { account } = initClient();

  if (!name || !pageId) {
    throw new Error("name e pageId são obrigatórios");
  }

  const linkData = {
    link: link || "https://www.example.com",
    message: message || "",
    call_to_action: { type: callToAction },
  };

  if (imageHash) {
    linkData.image_hash = imageHash;
  } else if (imageUrl) {
    linkData.picture = imageUrl;
  }

  const params = {
    name,
    object_story_spec: {
      page_id: pageId,
      link_data: linkData,
    },
  };

  const creative = await account.createAdCreative([], params);

  console.log(`\nCreativo criado com sucesso!`);
  console.log(`  ID: ${creative.id}`);
  console.log(`  Nome: ${name}`);

  return creative;
}

async function createAd({ name, adSetId, creativeId, status = "PAUSED" }) {
  const { account } = initClient();

  if (!name || !adSetId || !creativeId) {
    throw new Error("name, adSetId e creativeId são obrigatórios");
  }

  const params = {
    name,
    adset_id: adSetId,
    creative: { creative_id: creativeId },
    status,
  };

  const ad = await account.createAd([], params);

  console.log(`\nAnúncio criado com sucesso!`);
  console.log(`  ID: ${ad.id}`);
  console.log(`  Nome: ${name}`);
  console.log(`  AdSet: ${adSetId}`);
  console.log(`  Status: ${status}`);

  return ad;
}

async function uploadImage(imagePath) {
  const { account } = initClient();

  const image = await account.createAdImage([], {
    filename: imagePath,
  });

  console.log(`\nImagem enviada com sucesso!`);
  console.log(`  Hash: ${JSON.stringify(image)}`);

  return image;
}

const CALL_TO_ACTIONS = [
  "LEARN_MORE",
  "SHOP_NOW",
  "SIGN_UP",
  "BOOK_TRAVEL",
  "CONTACT_US",
  "DOWNLOAD",
  "GET_OFFER",
  "GET_QUOTE",
  "SUBSCRIBE",
  "WATCH_MORE",
  "APPLY_NOW",
  "ORDER_NOW",
  "WHATSAPP_MESSAGE",
  "SEND_WHATSAPP_MESSAGE",
];

module.exports = {
  listAds,
  createAdCreative,
  createAd,
  uploadImage,
  CALL_TO_ACTIONS,
};
