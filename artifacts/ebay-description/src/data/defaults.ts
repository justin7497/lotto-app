export type FooterSection = {
  title: string;
  body: string;
};

export const DEFAULT_PRODUCT_TITLE =
  "Marc Jacobs The Leather Bucket Bag H652L01PF22";

export const DEFAULT_PRODUCT_IMAGE = "";

/** KstarForAll 공통 하단 — eBay 참조 리스팅 정책 테이블 형식 */
export const DEFAULT_FOOTER_SECTIONS: FooterSection[] = [
  {
    title: "WELCOME TO KstarForAll",
    body: `Hey there! Welcome to KstarForAll
Shipped Directly from Korea
100% authentic products only`,
  },
  {
    title: "PACKED WITH CARE",
    body: `Every order is carefully checked and safely packed before shipment.
We do our best to make sure your item arrives safely.`,
  },
  {
    title: "IN CASE OF ANY ISSUE",
    body: `If there are any missing items, incorrect items, or delivery-related issues,
please contact us first through eBay messages before leaving neutral or negative feedback,
so we can quickly check the issue and help resolve it.`,
  },
  {
    title: "GOOD TO KNOW",
    body: `The outer box is designed to protect the item.
Minor scratches, pressure marks, dents, or discoloration that may occur during shipping may not be considered product defects.`,
  },
  {
    title: "SHIPPING INFO",
    body: `All shipments include a tracking number.
Delivery time may vary depending on the destination, local delivery conditions, and customs clearance.
Please make sure someone is available to receive the package upon delivery.
If your local customs office or delivery carrier contacts you, the buyer is responsible for checking the notice and completing the required delivery or pickup process.`,
  },
  {
    title: "IMPORT DUTIES & TAXES",
    body: `For U.S. orders, import duties and taxes are included in the item price, and the checkout amount is the final amount.
For orders outside the U.S., import duties, taxes, and additional charges may apply depending on each country's regulations.
In some countries, taxes may be automatically collected by eBay at checkout.
In other cases, they may be charged separately during customs clearance.
Please check your local customs office or eBay checkout page for accurate duties and tax information.`,
  },
  {
    title: "IMPORTANT NOTES",
    body: `Product images are representative images showing the condition and included contents of the same model.
Please review the title and specifications carefully before purchasing.`,
  },
  {
    title: "NEED HELP?",
    body: `Just send us a message through eBay messages.
We will be happy to help.

Thanks for shopping with KstarForAll
Hope this item makes your day!`,
  },
];
