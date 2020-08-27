import fs from 'fs/promises';
import SwaggerParser from "@apidevtools/swagger-parser";

const $s = await SwaggerParser.resolve("oapi3.json");
const mapping = JSON.parse(await fs.readFile('mapping.json'));

for (const spath of $s.paths()) {
    const def = $s.get(spath);
    for (const path in def.paths) {
        const pathDef = def.paths[path];

        let opDef = undefined;
        let opDefOperationId = undefined;
        let mapTo = undefined;

        if (pathDef.post) {
            opDef = pathDef.post;
            opDefOperationId = opDef.operationId;
            if (opDefOperationId && mapping.hasOwnProperty(opDefOperationId)) {
                mapTo = mapping[opDefOperationId];
                opDef.operationId = mapTo.self;
                if (opDef.requestBody
                    && opDef.requestBody.content
                    && opDef.requestBody.content['application/json']
                    && opDef.requestBody.content['application/json'].schema) {
                    const reqSchema = opDef.requestBody.content['application/json'].schema;
                    const reqSchemaRefPath = reqSchema.$ref;
                    if (reqSchemaRefPath) {
                        const oldSchemaShortName = reqSchemaRefPath.substring(reqSchemaRefPath.lastIndexOf('/') + 1);
                        def.components.schemas[mapTo.req] = def.components.schemas[oldSchemaShortName];
                        delete def.components.schemas[oldSchemaShortName];
                        opDef.requestBody.content['application/json'].schema.$ref = `#/components/schemas/${mapTo.req}`;
                    }
                }

            }
        } else if (pathDef.get) {
            opDef = pathDef.get;
            opDefOperationId = opDef.operationId;
            if (opDefOperationId && mapping.hasOwnProperty(opDefOperationId)) {
                mapTo = mapping[opDefOperationId];
                opDef.operationId = mapTo.self;
            }
            //TODO!:
        } else throw Error('NIE');

        if (mapTo && opDef.responses) {
            for (const responseCode in opDef.responses) {
                const response = opDef.responses[responseCode];
                if (!mapTo.resp[responseCode]) continue;
                if (response
                    && response.content
                    && response.content['application/json']
                    && response.content['application/json'].schema) {
                    const respSchema = response.content['application/json'].schema;
                    const respSchemaRefPath = respSchema.$ref;
                    if (respSchemaRefPath) {
                        const oldSchemaShortName = respSchemaRefPath.substring(respSchemaRefPath.lastIndexOf('/') + 1);
                        def.components.schemas[mapTo.resp[responseCode]] = def.components.schemas[oldSchemaShortName];
                        delete def.components.schemas[oldSchemaShortName];
                        response.content['application/json'].schema.$ref = `#/components/schemas/${mapTo.resp[responseCode]}`;
                    }
                }
            }
        }
    }
}


await fs.writeFile('out.json', JSON.stringify($s.toJSON()[$s.paths()[0]]));
