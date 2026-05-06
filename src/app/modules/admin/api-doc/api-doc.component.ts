import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EXPIRATION_TYPE_OPTIONS } from '../../../core/models/product-item.model';

@Component({
    selector: 'app-api-doc',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './api-doc.component.html',
    styleUrls: ['./api-doc.component.scss']
})
export class ApiDocComponent {
    readonly expirationTypeOptions = EXPIRATION_TYPE_OPTIONS;
    readonly expirationTypeText = this.expirationTypeOptions.map(option => option.value).join(' | ');

    readonly partnerUploadRequestExample = `{
  "accountData": "user1@mail.com|password1\\nuser2@mail.com|password2",
  "expirationType": "HOURS_3",
  "skipDuplicateCheck": false
}`;

    readonly partnerUploadResponseExample = `{
  "success": true,
  "message": "Success",
  "data": {
    "productId": 123,
    "totalInput": 2,
    "insertedCount": 2,
    "duplicateCount": 0,
    "message": "Upload thành công"
  }
}`;

    readonly partnerUploadCurlExample = `curl --location 'https://emailsieure.com/api/v1/product-items-tool/products/123/items' \\
--header 'Content-Type: application/json' \\
--header 'X-API-KEY: mtk_xxxxxxxxxxxxxxxxxxxx' \\
--data '{
  "accountData": "email1@example.com|pass1\\nemail2@example.com|pass2",
  "expirationType": "HOURS_3",
  "skipDuplicateCheck": false
}'`;

    readonly partnerImportCurlExample = `curl --location 'https://emailsieure.com/api/v1/product-items-tool/products/123/import?expirationType=HOURS_3&skipDuplicateCheck=false' \\
--header 'X-API-KEY: mtk_xxxxxxxxxxxxxxxxxxxx' \\
--form 'file=@accounts.txt'`;

    readonly partnerExpiredCurlExample = `curl --location 'https://emailsieure.com/api/v1/product-items-tool/products/123/expired' \\
--header 'X-API-KEY: mtk_xxxxxxxxxxxxxxxxxxxx'`;

    readonly adminNote = `Admin import cũ vẫn nằm ở /admin/api/v1/product-items/* và dùng Bearer admin. Partner tool nên dùng bộ endpoint /api/v1/product-items-tool/* để áp dụng whitelist sản phẩm và capability mới.`;
}
