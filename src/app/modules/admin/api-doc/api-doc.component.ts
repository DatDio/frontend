import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-api-doc',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './api-doc.component.html',
    styleUrls: ['./api-doc.component.scss']
})
export class ApiDocComponent {
    createRequestExample = `{
  "productId": 1,
  "accountData": "user1@mail.com|password1\\nuser2@mail.com|password2",
  "expirationType": "MONTH_1"
}`;

    createResponseExample = `{
    "success": true,
    "message": "Thêm thành công. Có 3 tài khoản bị trùng.",
    "timestamp": "2026-01-05T04:45:00.644664544"
}`;

    createCurlExample = `curl --location 'https://emailsieure.com/admin/api/v1/product-items/create' \\
--header 'Content-Type: application/json' \\
--header 'X-API-KEY: <your_api_key>' \\
--data-raw '{
    "productId": 1,
    "accountData": "email1@example|passexample1|refresh_token1|client_id1\\nemail2@example|passexample2|refresh_token2|client_id2\\nemail3@example|passexample3|refresh_token3|client_id3\\n",
    "expirationType": "NONE"
}'`;

    importCurlExample = `curl -X POST \\
  'https://emailsieure.com/admin/api/v1/product-items/import/1?expirationType=MONTH_1' \\
  -H 'X-API-KEY: <your_api_key>' \\
  -F 'file=@accounts.txt'`;

    importResponseExample = `{
    "success": true,
    "message": "Import thành công 0 tài khoản",
    "timestamp": "2026-01-05T04:37:40.489892517"
}`;
}
