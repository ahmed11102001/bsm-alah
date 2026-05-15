-- Remove @unique constraint from ShopifyStore.shop
-- لأن دلوقتي shop = اسم المتجر اللي اليوزر بيكتبه، مش domain
-- ومتنين يوزرز مختلفين ممكن يكتبوا نفس الاسم

DROP INDEX IF EXISTS "ShopifyStore_shop_key";