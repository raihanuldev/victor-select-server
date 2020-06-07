const {
  saveCreditCard,
  authorizeAndSaveCreditCard,
} = require("../services/usaepay");
const { validateAddress } = require("../services/shippo");

const getCurrentCreditCard = async (userId, prisma) => {
  const creditcards = await prisma
    .user({ id: userId })
    .creditCards({ where: { active: true } });

  console.log("Credit Cards:", creditcards);

  return creditcards[0];
};

const updateCreditCard = async (
  userId,
  cardInput,
  prisma,
  saveOnly = false
) => {
  let response = null;
  if (saveOnly) {
    response = await saveCreditCard(cardInput);
  } else {
    response = await authorizeAndSaveCreditCard(cardInput);
  }
  console.log("CC Response:", response);

  if (response.result_code !== "A") {
    throw new Error("Unable to verify credit card.");
  }

  const savedCard = response.savedcard;

  let newCC = null;
  if (savedCard) {
    // Update all current user credit cards to inactive
    await prisma.updateManyCreditCards({
      where: { user: { id: userId }, active: true },
      data: { active: false },
    });
    // Save new active card
    newCC = await prisma.createCreditCard({
      ccType: savedCard.type,
      ccToken: savedCard.key,
      ccNumber: savedCard.cardnumber,
      ccExpire: cardInput.cardExpiry,
      active: true,
      user: {
        connect: {
          id: userId,
        },
      },
    });
  }

  return newCC;
};

const getCurrentAddress = async (userId, prisma) => {
  const addresses = await prisma
    .user({ id: userId })
    .addresses({ where: { active: true } });

  if (addresses.length) return addresses[0];

  return null;
};

const updateAddress = async ({ user, newAddress, prisma }) => {
  // Get the current User's address
  let currentAddress = await getCurrentAddress(user.id, prisma);
  // There's nothing to do here
  if (!currentAddress && !newAddress) return;

  const addressInput = {
    name: user.firstName + " " + user.lastName,
    email: user.email,
    addressOne: "",
    addressTwo: "",
    city: "",
    state: "",
    zipcode: "",
    telephone: "",
  };

  if (!newAddress) {
    addressInput.addressOne = currentAddress.addressOne;
    addressInput.addressTwo = currentAddress.addressTwo;
    addressInput.city = currentAddress.city;
    addressInput.state = currentAddress.state;
    addressInput.zipcode = currentAddress.zipcode;
    addressInput.telephone = currentAddress.telephone;
  } else {
    addressInput.addressOne = newAddress.addressOne;
    addressInput.addressTwo = newAddress.addressTwo;
    addressInput.city = newAddress.city;
    addressInput.state = newAddress.state;
    addressInput.zipcode = newAddress.zipcode;
    addressInput.telephone = newAddress.telephone;
  }

  let shippoId = "";
  const shippoRet = await validateAddress(addressInput);
  if (!shippoRet.valid) {
    return null;
  }

  if (shippoRet) {
    shippoId = shippoRet.shippoId;
  }
  console.log("addressInput", addressInput);

  delete addressInput.name;
  const upsertAddressInput = {
    ...addressInput,
    active: true,
    shippoId: shippoId,
    user: {
      connect: {
        id: user.id,
      },
    },
  };

  if (!currentAddress) {
    currentAddress = await prisma.createAddress({
      ...upsertAddressInput,
    });
  } else {
    currentAddress = await prisma.updateAddress({
      where: { id: currentAddress.id },
      data: {
        ...upsertAddressInput,
      },
    });
  }

  return currentAddress;
};

const setSupplementPricing = async (subscription, prisma) => {
  const product = await prisma.product({
    productId: subscription.drugId,
  });

  let shippingInterval = 0;
  let price = 0;
  switch (subscription.shippingInterval) {
    case "3":
      shippingInterval = 3;
      if (product) price = product.threeMonthPrice;
      break;

    case "2":
      shippingInterval = 2;
      if (product) price = product.twoMonthPrice;
      break;

    case "1":
      shippingInterval = 1;
      if (product) price = product.monthlyPrice;
      break;

    default:
  }
  const amountDue = shippingInterval * price;
  return { shippingInterval, amountDue };
};

const setPricing = async (subscription, prisma) => {
  const product = await prisma.product({
    productId: subscription.drugId + subscription.doseOption,
  });
  let addon = null;
  if (subscription.addOnId !== "NO_ADDON") {
    addon = await prisma.product({
      productId: subscription.addOnId + "ADDON",
    });
  }

  let shippingInterval = 0;
  let price = 0;
  const dosesPerMonth = !subscription.dosesPerMonth
    ? 1
    : subscription.dosesPerMonth;

  switch (subscription.shippingInterval) {
    case "everyThree":
      shippingInterval = 3;
      if (product) price = product.threeMonthPrice * dosesPerMonth;
      if (addon) price += addon.threeMonthPrice * 30;
      break;

    case "everyTwo":
      shippingInterval = 2;
      if (product) price = product.twoMonthPrice * dosesPerMonth;
      if (addon) price += addon.twoMonthPrice * 30;
      break;

    case "monthly":
      shippingInterval = 1;
      if (product) price = product.monthlyPrice * dosesPerMonth;
      if (addon) price += addon.monthlyPrice * 30;
      break;

    default:
  }
  const amountDue = shippingInterval * price;
  return { shippingInterval, amountDue };
};

module.exports = {
  getCurrentCreditCard,
  updateAddress,
  updateCreditCard,
  getCurrentAddress,
  setPricing,
  setSupplementPricing,
};
