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

import com.graphhopper.routing.VirtualEdgeIteratorState;
import com.graphhopper.storage.*;
import com.graphhopper.util.*;
import org.junit.After;
import org.junit.Test;

import static org.junit.Assert.assertEquals;
import org.junit.Before;

/**
 * @author Peter Karich
 */
public class ElevationWeightingTest
{
    private EncodingManager encodingManager;
    private FlagEncoder encoder;
    private GraphHopperStorage g;
    EdgeIteratorState flatEdge, eleEdge;

    @Before
    public void setUp()
    {
        encoder = new BikeFlagEncoder();
        encodingManager = new EncodingManager(encoder);
        g = new GraphHopperStorage(new RAMDirectory(), encodingManager, true, new GraphExtension.NoOpExtension()).create(100);
    }

    @After
    public void tearDown()
    {
        g.close();
    }

    void initGraph( Graph g )
    {
        //
        //  /*-*\
        // 0     1
        // |
        // 2
        NodeAccess na = g.getNodeAccess();
        
        na.setNode(0, 51, 0, 100);
        na.setNode(1, 51, 1, 100);
        na.setNode(2, 51, 0, 100);
        na.setNode(3, 51, 1, 300);
        
        flatEdge = g.edge(0, 1, 10, true).setWayGeometry(Helper.createPointList3D(51, 0, 100, 51, 1, 100));
        eleEdge =  g.edge(2, 3, 10, true).setWayGeometry(Helper.createPointList3D(51, 0, 100, 51, 1, 300));
    }
    

    @Test
    public void testWeightWrongHeading()
    {
        initGraph(g);
        PriorityWeighting prioinstance = new PriorityWeighting(encoder);
        double originaltime = prioinstance.calcWeight(flatEdge, false, 0);        

        EleWeighting eleinstance = new EleWeighting(encoder, new PMap().put("weighthing", "elevation").put("ascendAvoidance","1.0"), g.getNodeAccess());
        assertEquals(originaltime, eleinstance.calcWeight(flatEdge, false, 0), 1e-8);

        eleinstance = new EleWeighting(encoder, new PMap().put("weighthing", "elevation").put("ascendAvoidance","1.0"), g.getNodeAccess());        
        assertEquals(originaltime * 10.0, eleinstance.calcWeight(eleEdge, false, 0), 1e-8);

        eleinstance = new EleWeighting(encoder, new PMap().put("weighthing", "elevation").put("ascendAvoidance","-1.0"), g.getNodeAccess());
        assertEquals(2*1.234567901, eleinstance.calcWeight(eleEdge, false, 0), 1e-8);
        
    }

}
