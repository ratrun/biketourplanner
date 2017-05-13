/*
 * Copyright © 2016. ratrun
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.graphhopper.http;

import com.fasterxml.jackson.databind.node.ObjectNode;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

public class ShutDownRequestServlet extends GHBaseServlet {
    private final GHServer ghserver;

    ShutDownRequestServlet(GHServer aThis) {
        ghserver = aThis;
    }

    @Override
    protected void service(HttpServletRequest req, HttpServletResponse res) throws ServletException, IOException {
        logger.info("Shutdown request received from " + req.getRemoteAddr() + " : " + req.getRequestURL()+ " : " + req.getQueryString() );
        ObjectNode json = objectMapper.createObjectNode();
        if (!req.getRequestURI().equals("/shutdown")) {
           json.put("message", "Not found");
           writeJsonError(res, HttpServletResponse.SC_NOT_FOUND, json);
        } else if (req.getQueryString().equals("token=osm")) {
              ghserver.stop();
           } else {
              json.put("message", "Incorrect shutdown token");
              writeJsonError(res, HttpServletResponse.SC_FORBIDDEN, json);
           }
    }
}
