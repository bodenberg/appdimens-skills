package com.acme.home

@Preview(device = "id:medium_phone")
@Composable fun HomePreview() = Home()

@Preview(device = "id:medium_phone", fontScale = 1f)
@Composable fun HomeDarkPreview() = Home()

@Preview(widthDp = 360, heightDp = 800)
@Composable fun HomeSmallPreview() = Home()

@Preview(device = "spec:width=673dp,height=841dp")
@Composable fun HomeFoldPreview() = Home()
