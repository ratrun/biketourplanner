/*
 *  Licensed to GraphHopper and Peter Karich under one or more contributor
 *  license agreements. See the NOTICE file distributed with this work for
 *  additional information regarding copyright ownership.
 *
 *  GraphHopper licenses this file to you under the Apache License,
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
package com.graphhopper.routing.util;

/**
 * The AdjustedWeighting wraps another Weighting.
 *
 * @author Robin Boldt
 */
public abstract class AbstractAdjustedWeighting implements Weighting
{

    protected final Weighting superWeighting;

    public AbstractAdjustedWeighting( Weighting superWeighting )
    {
        if (superWeighting == null)
            throw new IllegalArgumentException("No super weighting set");
        this.superWeighting = superWeighting;
    }

    /**
     * Returns the flagEncoder of the superWeighting. Usually we do not have a Flagencoder here.
     */
    @Override
    public FlagEncoder getFlagEncoder()
    {
        return superWeighting.getFlagEncoder();
    }

    @Override
    public boolean matches( String weightingAsStr, FlagEncoder encoder )
    {
        return getName().equals(weightingAsStr) && encoder == superWeighting.getFlagEncoder();
    }

}

