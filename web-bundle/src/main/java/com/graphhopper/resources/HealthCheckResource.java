/*
 *  Licensed to GraphHopper GmbH under one or more contributor
 *  license agreements. See the NOTICE file distributed with this work for
 *  additional information regarding copyright ownership.
 *
 *  GraphHopper GmbH licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except in
 *  compliance with the License. You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
package com.graphhopper.resources;

import com.codahale.metrics.health.HealthCheck;
import com.codahale.metrics.health.HealthCheckRegistry;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.Response;
import java.util.SortedMap;

/**
 * This is a public facing health check that runs all registered health checks.
 * Instead of providing details like the admin health check, this only returns OK/200 or UNHEALTHY/500.
 *
 * @author Robin Boldt
 */
@Path("health")
public class HealthCheckResource {

    private HealthCheckRegistry registry;

    @Inject
    public HealthCheckResource(HealthCheckRegistry registry) {
        this.registry = registry;
    }

    @GET
    public Response doGet() {
        SortedMap<String, HealthCheck.Result> results = registry.runHealthChecks();
        for (HealthCheck.Result result : results.values()) {
            if (!result.isHealthy()) {
                return Response.status(500).entity("UNHEALTHY").build();
            }
        }
        return Response.ok("OK").build();
    }
}
